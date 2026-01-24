
import 'package:flutter/material.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import '../models/card_news.dart';

class RichTextToolbar extends StatelessWidget {
  final CustomTextStyle style;
  final Function(CustomTextStyle) onUpdate;
  final TextEditingController controller;

  const RichTextToolbar({
    Key? key,
    required this.style,
    required this.onUpdate,
    required this.controller,
  }) : super(key: key);
  
  // Helper to get the actual controller to manipulate
  TextEditingController get _controller => controller;

  void _wrapSelection(String start, String end) {
    final controller = _controller;
    final text = controller.text;
    final selection = controller.selection;
    
    if (selection.start < 0) return;

    String selectedText = text.substring(selection.start, selection.end);
    String newText;
    int newSelectionEnd;

    // Check if already wrapped - Toggle logic
    // We strictly check if the precise selection is wrapped, 
    // OR if the selection *content* has the tags inside it? 
    // For now, strict wrapping check: does selection START with "start" and END with "end"?
    // But usually user selects "Foo" inside "**Foo**". 
    // We should check the surrounding text?
    // Let's stick to: If user selects purely content, we wrap.
    // If user includes tags in selection, we unwrap.
    // Also, if the active style is "Bold" (detected via _controller.text.contains or context), we might want to unwrap the *surrounding* tags even if not fully selected.
    // But that requires finding the token bounds. Too complex for now regarding the "broken tags" issue.
    
    // Simple toggle: If selection itself contains the tags at boundaries, remove them.
    if (selectedText.startsWith(start) && selectedText.endsWith(end) && selectedText.length >= start.length + end.length) {
      // Unwrap
      newText = text.replaceRange(
        selection.start, 
        selection.end, 
        selectedText.substring(start.length, selectedText.length - end.length)
      );
      newSelectionEnd = selection.start + (selectedText.length - start.length - end.length);
    } else {
      // Wrap
      newText = text.replaceRange(
        selection.start, 
        selection.end, 
        '$start$selectedText$end'
      );
      newSelectionEnd = selection.start + start.length + selectedText.length + end.length;
    }

    controller.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: newSelectionEnd),
    );
  }

  void _pickColor(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('텍스트 색상'),
        content: SingleChildScrollView(
          child: ColorPicker(
            pickerColor: Colors.black, // Default
            onColorChanged: (color) {
              // Use full 8-digit hex (AARRGGBB) to ensure exact color match including alpha
              final hex = '#${color.value.toRadixString(16).padLeft(8, '0').toUpperCase()}';
              // Check if we have selection, if so wrap it. IF no selection, maybe update simple global style?
              // User request: "Drag to change color". So assume selection.
              if (_controller.selection.isValid && !_controller.selection.isCollapsed) {
                 _wrapSelection('<c:$hex>', '</c>');
              } else {
                 // Fallback or global update if needed (but focusing on inline now)
                 // onUpdate(style..color = hex); 
              }
            },
            hexInputBar: true,
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('완료')),
        ],
      ),
    );
  }

  bool _isStyleActive(String tag) {
    final text = _controller.text;
    final selection = _controller.selection;
    if (!selection.isValid) return false;

    // Regex to find all occurrences of the tag pair
    // e.g. \*\*(.*?)\*\*
    final escaped = RegExp.escape(tag);
    final RegExp exp = RegExp('$escaped(.*?)$escaped', dotAll: true);
    final matches = exp.allMatches(text);

    for (final match in matches) {
      // Check if cursor (selection.start) is within the match range
      // inclusive of the tags themselves so user can easily toggle off at the boundary
      if (selection.start >= match.start && selection.start <= match.end) {
        return true;
      }
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Font Family & Size
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Font Family Dropdown
                _buildDropdown<String>(
                  value: style.fontFamily,
                  items: [
                    'Noto Sans KR', 
                    'Black Han Sans', 
                    'Do Hyeon', 
                    'Gowun Batang', 
                    'Nanum Gothic', 
                    'Sunflower',
                    'Jua',
                    'Hi Melody',
                    'Gamja Flower',
                    'Single Day',
                    'Noto Serif KR',
                  ],
                  onChanged: (val) => onUpdate(style..fontFamily = val!),
                  icon: Icons.font_download,
                ),
                SizedBox(width: 8),
                // Font Size Stepper
                _buildFontSizeStepper(),
              ],
            ),
          ),
          Divider(height: 16),
          // Row 2: Formatting Buttons
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Formatting Buttons (Text Based)
                _buildTextButton("굵게", _isStyleActive('**'), () => _wrapSelection('**', '**')),
                SizedBox(width: 4),
                _buildTextButton("강조", _isStyleActive('=='), () => _wrapSelection('==', '==')),

                SizedBox(width: 4),
                
                // Alignment
                Container(
                  padding: EdgeInsets.only(left: 8, right: 4),
                  child: Text("정렬", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey[700])),
                ),
                _buildIconTextButton(Icons.format_align_left, "왼쪽", style.align == 'left', () => onUpdate(style..align = 'left')),
                _buildIconTextButton(Icons.format_align_center, "중앙", style.align == 'center', () => onUpdate(style..align = 'center')),
                _buildIconTextButton(Icons.format_align_right, "오른쪽", style.align == 'right', () => onUpdate(style..align = 'right')),
                SizedBox(width: 8),

                // Color Picker
                InkWell(
                  onTap: () => _pickColor(context),
                  child: Container(
                     padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                     decoration: BoxDecoration(
                       border: Border.all(color: Colors.grey.shade300),
                       borderRadius: BorderRadius.circular(4),
                       color: Colors.white,
                     ),
                     child: Text(
                       "글자색",
                       style: TextStyle(
                         color: style.color.isNotEmpty 
                             ? (style.color.replaceFirst('#', '').length == 8 
                                 ? Color(int.parse(style.color.replaceFirst('#', ''), radix: 16))
                                 : Color(int.parse(style.color.replaceFirst('#', ''), radix: 16) + 0xFF000000))
                             : Colors.black,
                         fontWeight: FontWeight.bold,
                         fontSize: 13,
                       ),
                     ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextButton(String label, bool isActive, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 2),
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? Colors.blue[50] : Colors.white,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: isActive ? Colors.blue[200]! : Colors.grey[300]!),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            color: isActive ? Colors.blue[800] : Colors.grey[700],
          ),
        ),
      ),
    );
  }

  Widget _buildIconTextButton(IconData icon, String label, bool isActive, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 2),
        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? Colors.blue[50] : Colors.white,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: isActive ? Colors.blue[200]! : Colors.grey[300]!),
        ),
        child: Row(
          children: [
            Icon(
              icon, 
              size: 16, 
              color: isActive ? Colors.blue[800] : Colors.grey[700]
            ),
            SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                color: isActive ? Colors.blue[800] : Colors.grey[700],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildIconButton(IconData icon, bool isActive, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 2),
        padding: EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isActive ? Colors.blue[50] : Colors.white,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: isActive ? Colors.blue[200]! : Colors.grey[300]!),
        ),
        child: Icon(
          icon,
          size: 18,
          color: isActive ? Colors.blue[800] : Colors.grey[700],
        ),
      ),
    );
  }

  Widget _buildDropdown<T>({
    required T value,
    required List<T> items,
    required Function(T?) onChanged,
    required IconData icon,
    Map<T, String>? labelMap,
  }) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: Colors.grey[600]),
          SizedBox(width: 4),
          DropdownButton<T>(
            value: items.contains(value) ? value : items.first,
            items: items.map((item) {
              return DropdownMenuItem<T>(
                value: item,
                child: Text(
                  labelMap != null ? labelMap[item]! : item.toString(),
                  style: TextStyle(fontSize: 13),
                ),
              );
            }).toList(),
            onChanged: onChanged,
            underline: SizedBox(),
            isDense: true,
            icon: Icon(Icons.arrow_drop_down, size: 18),
          ),
        ],
      ),
    );
  }
  void _changeFontSize(int delta) {
    double current = 16; // default
    String currentStr = style.fontSize;
    
    // Parse
    if (currentStr.isNotEmpty) {
       final numeric = double.tryParse(currentStr);
       if (numeric != null) {
         current = numeric;
       } else {
         // Map from tailwind class
         switch(currentStr) {
            case 'text-sm': current = 14; break;
            case 'text-base': current = 16; break;
            case 'text-lg': current = 18; break;
            case 'text-xl': current = 20; break;
            case 'text-2xl': current = 24; break;
            case 'text-3xl': current = 30; break;
            case 'text-4xl': current = 36; break;
            case 'text-5xl': current = 48; break;
            // case 'text-6xl': current = 60; break;
         }
       }
    }
    
    double newSize = current + delta;
    if (newSize < 10) newSize = 10;
    if (newSize > 100) newSize = 100;
    
    onUpdate(style..fontSize = newSize.toInt().toString()); 
  }

  Widget _buildFontSizeStepper() {
      // Calculate current for display
      String display = "16"; 
      if (style.fontSize.isNotEmpty) {
          double? v = double.tryParse(style.fontSize);
          if (v != null) {
              display = v.toInt().toString();
          } else {
             switch(style.fontSize) {
                case 'text-sm': display = "14"; break;
                case 'text-base': display = "16"; break;
                case 'text-lg': display = "18"; break;
                case 'text-xl': display = "20"; break;
                case 'text-2xl': display = "24"; break;
                case 'text-3xl': display = "30"; break;
                case 'text-4xl': display = "36"; break;
                case 'text-5xl': display = "48"; break;
                case 'text-6xl': display = "60"; break;
             }
          }
      }

      return Container(
          padding: EdgeInsets.zero,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(4),
            color: Colors.white,
          ),
          child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                  _buildStepperBtn(Icons.remove, () => _changeFontSize(-2)),
                  Container(
                      width: 30, 
                      alignment: Alignment.center,
                      child: Text(display, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold))
                  ),
                  _buildStepperBtn(Icons.add, () => _changeFontSize(2)),
              ]
          )
      );
  }

  Widget _buildStepperBtn(IconData icon, VoidCallback onTap) {
      return InkWell(
          onTap: onTap,
          child: Padding(
              padding: EdgeInsets.all(8),
              child: Icon(icon, size: 16, color: Colors.grey[700]),
          )
      );
  }
}
