import 'package:flutter_quill/quill_delta.dart';

/// 우리 앱의 마크다운 형식 ↔ Quill Delta 상호 변환기
/// 마크다운: **굵게**, <c:#HEX>색상</c>, 줄바꿈 \n
class QuillMarkdownConverter {
  // ─────────────────────────────────────────────
  // 마크다운 문자열 → Quill Delta
  // ─────────────────────────────────────────────
  static Delta markdownToDelta(String markdown) {
    final delta = Delta();
    _parseSegment(markdown, {}, delta);
    // Quill 문서는 반드시 \n 으로 끝나야 함
    if (!markdown.endsWith('\n')) {
      delta.insert('\n');
    }
    return delta;
  }

  static void _parseSegment(
      String text, Map<String, dynamic> attrs, Delta delta) {
    int i = 0;
    while (i < text.length) {
      // 다음 태그 위치 탐색
      final boldIdx = text.indexOf('**', i);
      final colorIdx = text.indexOf('<c:', i);
      final nlIdx = text.indexOf('\\n', i); // 리터럴 \n (JSON에서 줄바꿈)
      final realNlIdx = text.indexOf('\n', i); // 실제 줄바꿈

      int closest = -1;
      String? tagType;
      void check(int idx, String t) {
        if (idx != -1 && (closest == -1 || idx < closest)) {
          closest = idx;
          tagType = t;
        }
      }

      check(boldIdx, 'bold');
      check(colorIdx, 'color');
      check(nlIdx, 'nl_escape');
      check(realNlIdx, 'nl_real');

      if (closest == -1) {
        // 남은 텍스트 전부 삽입
        if (i < text.length) {
          _insertWithAttrs(delta, text.substring(i), attrs);
        }
        break;
      }

      // 태그 이전 일반 텍스트
      if (closest > i) {
        _insertWithAttrs(delta, text.substring(i, closest), attrs);
      }

      if (tagType == 'nl_escape') {
        delta.insert('\n', attrs.isNotEmpty ? Map<String, dynamic>.from(attrs) : null);
        i = closest + 2;
      } else if (tagType == 'nl_real') {
        delta.insert('\n', attrs.isNotEmpty ? Map<String, dynamic>.from(attrs) : null);
        i = closest + 1;
      } else if (tagType == 'bold') {
        final end = text.indexOf('**', closest + 2);
        if (end == -1) {
          _insertWithAttrs(delta, text.substring(closest), attrs);
          break;
        }
        final content = text.substring(closest + 2, end);
        final boldAttrs = Map<String, dynamic>.from(attrs)..['bold'] = true;
        _parseSegment(content, boldAttrs, delta);
        i = end + 2;
      } else if (tagType == 'color') {
        final tagClose = text.indexOf('>', closest);
        if (tagClose == -1) {
          _insertWithAttrs(delta, text.substring(closest), attrs);
          break;
        }
        final tag = text.substring(closest, tagClose + 1); // <c:#HEX>
        final hex = tag.substring(3, tag.length - 1); // #RRGGBB
        final contentEnd = text.indexOf('</c>', tagClose + 1);
        if (contentEnd == -1) {
          _insertWithAttrs(delta, text.substring(closest), attrs);
          break;
        }
        final content = text.substring(tagClose + 1, contentEnd);
        final colorAttrs = Map<String, dynamic>.from(attrs)..['color'] = hex;
        _parseSegment(content, colorAttrs, delta);
        i = contentEnd + 4;
      }
    }
  }

  static void _insertWithAttrs(
      Delta delta, String text, Map<String, dynamic> attrs) {
    if (text.isEmpty) return;
    delta.insert(text, attrs.isNotEmpty ? Map<String, dynamic>.from(attrs) : null);
  }

  // ─────────────────────────────────────────────
  // Quill Delta → 마크다운 문자열
  // ─────────────────────────────────────────────
  static String deltaToMarkdown(Delta delta) {
    final buffer = StringBuffer();

    for (final op in delta.toList()) {
      if (op.key != 'insert') continue;
      final data = op.data;
      final attrs = op.attributes ?? {};

      String text;
      if (data is String) {
        text = data;
      } else {
        continue;
      }

      // 줄바꿈을 \n 이스케이프로 저장 (단, 마지막 \n 은 제외)
      final lines = text.split('\n');
      for (int i = 0; i < lines.length; i++) {
        final line = lines[i];
        if (line.isEmpty && i == lines.length - 1) {
          // Quill 문서 끝의 빈 줄은 무시
          continue;
        }
        String seg = line;

        // 색상 래핑 (bold보다 바깥)
        if (attrs.containsKey('color')) {
          final color = attrs['color'] as String;
          // bold와 color 동시에 있을 경우
          if (attrs.containsKey('bold') && attrs['bold'] == true) {
            seg = '<c:$color>**$seg**</c>';
          } else {
            seg = '<c:$color>$seg</c>';
          }
        } else if (attrs.containsKey('bold') && attrs['bold'] == true) {
          seg = '**$seg**';
        }

        buffer.write(seg);

        // 마지막 라인이 아니면 줄바꿈 추가
        if (i < lines.length - 1) {
          buffer.write('\n');
        }
      }
    }

    return buffer.toString();
  }
}
