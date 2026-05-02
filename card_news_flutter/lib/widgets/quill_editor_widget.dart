import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart';
import '../utils/quill_markdown_converter.dart';

/// WYSIWYG 에디터 위젯
/// - 초기 마크다운 문자열을 받아 Quill 에디터로 표시
/// - 내용이 변경될 때마다 onChanged(markdown) 콜백 호출
class QuillEditorWidget extends StatefulWidget {
  final String initialMarkdown;
  final TextStyle baseStyle;
  final TextAlign textAlign;
  final String hintText;
  final ValueChanged<String> onChanged;
  final FocusNode? focusNode;

  const QuillEditorWidget({
    Key? key,
    required this.initialMarkdown,
    required this.baseStyle,
    required this.textAlign,
    required this.hintText,
    required this.onChanged,
    this.focusNode,
  }) : super(key: key);

  @override
  State<QuillEditorWidget> createState() => QuillEditorWidgetState();
}

class QuillEditorWidgetState extends State<QuillEditorWidget> {
  late QuillController _controller;
  bool _isUpdating = false;

  QuillController get controller => _controller;

  @override
  void initState() {
    super.initState();
    final delta = QuillMarkdownConverter.markdownToDelta(widget.initialMarkdown);
    _controller = QuillController(
      document: Document.fromDelta(delta),
      selection: const TextSelection.collapsed(offset: 0),
      keepStyleOnNewLine: true,
    );
    _controller.addListener(_onDocumentChanged);
  }

  void _onDocumentChanged() {
    if (_isUpdating) return;
    final markdown = QuillMarkdownConverter.deltaToMarkdown(
      _controller.document.toDelta(),
    );
    widget.onChanged(markdown);
  }

  /// 외부에서 bold 토글
  void toggleBold() {
    _controller.formatSelection(Attribute.bold);
  }

  /// 외부에서 색상 적용
  void applyColor(Color color) {
    final hex =
        '#${color.r.round().toRadixString(16).padLeft(2, '0')}${color.g.round().toRadixString(16).padLeft(2, '0')}${color.b.round().toRadixString(16).padLeft(2, '0')}';
    _controller.formatSelection(ColorAttribute(hex));
  }

  /// 외부에서 색상 초기화
  void clearColor() {
    _controller.formatSelection(const ColorAttribute(null));
  }

  @override
  void dispose() {
    _controller.removeListener(_onDocumentChanged);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return QuillEditor.basic(
      controller: _controller,
      focusNode: widget.focusNode ?? FocusNode(),
      config: QuillEditorConfig(
        placeholder: widget.hintText,
        expands: false,
        padding: EdgeInsets.zero,
        customStyles: DefaultStyles(
          paragraph: DefaultTextBlockStyle(
            widget.baseStyle,
            HorizontalSpacing.zero,
            VerticalSpacing.zero,
            VerticalSpacing.zero,
            null,
          ),
          h1: DefaultTextBlockStyle(
            widget.baseStyle,
            HorizontalSpacing.zero,
            VerticalSpacing.zero,
            VerticalSpacing.zero,
            null,
          ),
        ),
      ),
    );
  }
}
