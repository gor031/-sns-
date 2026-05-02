import 'package:flutter/material.dart';

class StyledTextEditingController extends TextEditingController {
  StyledTextEditingController({String? text}) : super(text: text);

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final String text = value.text;
    if (text.isEmpty) return TextSpan(text: text, style: style);

    final List<InlineSpan> spans = _parseSpans(text, style ?? const TextStyle());
    return TextSpan(children: spans, style: style);
  }

  List<InlineSpan> _parseSpans(String text, TextStyle baseStyle) {
    final List<InlineSpan> spans = [];
    // 태그를 투명하게 숨기기 위한 스타일
    final TextStyle hiddenStyle = baseStyle.copyWith(
      color: Colors.transparent,
      fontSize: 0.001, // 공간을 거의 차지하지 않도록
    );

    int i = 0;
    while (i < text.length) {
      // 다음 태그 위치 탐색
      final int boldIdx = text.indexOf('**', i);
      final int colorIdx = text.indexOf('<c:', i);
      final int newlineIdx = text.indexOf('\n', i);

      // 가장 가까운 특수 위치 찾기
      int closest = -1;
      String? type;

      void check(int idx, String t) {
        if (idx != -1 && (closest == -1 || idx < closest)) {
          closest = idx;
          type = t;
        }
      }

      check(boldIdx, 'bold');
      check(colorIdx, 'color');
      check(newlineIdx, 'newline');

      if (closest == -1) {
        // 더 이상 태그 없음 - 나머지 전부 일반 텍스트
        spans.add(TextSpan(text: text.substring(i), style: baseStyle));
        break;
      }

      // 태그 이전 일반 텍스트 추가
      if (closest > i) {
        spans.add(TextSpan(text: text.substring(i, closest), style: baseStyle));
      }

      if (type == 'newline') {
        spans.add(TextSpan(text: '\n', style: baseStyle));
        i = closest + 1;
      } else if (type == 'bold') {
        final int end = text.indexOf('**', closest + 2);
        if (end == -1) {
          // 닫는 ** 없음 → 그냥 텍스트로
          spans.add(TextSpan(text: text.substring(closest), style: baseStyle));
          break;
        }
        // 여는 ** → 투명
        spans.add(TextSpan(text: '**', style: hiddenStyle));
        // 볼드 내용
        final String content = text.substring(closest + 2, end);
        spans.addAll(_parseSpans(
            content, baseStyle.copyWith(fontWeight: FontWeight.bold)));
        // 닫는 ** → 투명
        spans.add(TextSpan(text: '**', style: hiddenStyle));
        i = end + 2;
      } else if (type == 'color') {
        // <c:#HEX> ... </c>
        final int tagClose = text.indexOf('>', closest);
        if (tagClose == -1) {
          spans.add(TextSpan(text: text.substring(closest), style: baseStyle));
          break;
        }
        final String tag = text.substring(closest, tagClose + 1); // <c:#HEX>
        final String hex = tag.substring(3, tag.length - 1); // #HEX
        final Color? color = _parseColor(hex);

        final int contentEnd = text.indexOf('</c>', tagClose + 1);
        if (contentEnd == -1) {
          spans.add(TextSpan(text: text.substring(closest), style: baseStyle));
          break;
        }

        // 여는 태그 → 투명
        spans.add(TextSpan(text: tag, style: hiddenStyle));
        // 색상 적용된 내용
        final String content = text.substring(tagClose + 1, contentEnd);
        final TextStyle colorStyle =
            color != null ? baseStyle.copyWith(color: color) : baseStyle;
        spans.addAll(_parseSpans(content, colorStyle));
        // 닫는 태그 → 투명
        spans.add(TextSpan(text: '</c>', style: hiddenStyle));
        i = contentEnd + 4;
      }
    }

    return spans;
  }

  Color? _parseColor(String hex) {
    try {
      final String h = hex.replaceFirst('#', '');
      if (h.length == 6) {
        return Color(int.parse(h, radix: 16) + 0xFF000000);
      } else if (h.length == 8) {
        return Color(int.parse(h, radix: 16));
      }
    } catch (_) {}
    return null;
  }
}
