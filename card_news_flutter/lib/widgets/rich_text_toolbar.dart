
import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart' hide Text;
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import '../models/card_news.dart';

class RichTextToolbar extends StatelessWidget {
  final CustomTextStyle style;
  final Function(CustomTextStyle) onUpdate;
  final QuillController controller;

  const RichTextToolbar({
    Key? key,
    required this.style,
    required this.onUpdate,
    required this.controller,
  }) : super(key: key);

  /// 현재 선택 영역에 Bold가 적용되어 있는지 확인
  bool _isBoldActive() {
    final attrs = controller.getSelectionStyle().attributes;
    return attrs.containsKey(Attribute.bold.key) &&
        attrs[Attribute.bold.key]?.value == true;
  }

  void _toggleBold() {
    controller.formatSelection(
        _isBoldActive() ? Attribute.clone(Attribute.bold, null) : Attribute.bold);
  }

  void _pickColor(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('텍스트 색상'),
        content: SingleChildScrollView(
          child: ColorPicker(
            pickerColor: Colors.black,
            onColorChanged: (color) {
              final hex =
                  '#${color.red.toRadixString(16).padLeft(2, '0')}'
                  '${color.green.toRadixString(16).padLeft(2, '0')}'
                  '${color.blue.toRadixString(16).padLeft(2, '0')}';
              controller.formatSelection(ColorAttribute(hex));
            },
            hexInputBar: true,
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context), child: const Text('완료')),
        ],
      ),
    );
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
                // Font Family Dropdown ("글씨체 바꾸기")
                _buildFontDropdown(
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
                _buildTextButton("굵게", _isBoldActive(), _toggleBold),
                SizedBox(width: 8),
                
                // Alignment
                _buildIconTextButton(Icons.format_align_left, "왼쪽", style.align == 'left', () => _setAlignment('left')),
                _buildIconTextButton(Icons.format_align_center, "중앙", style.align == 'center', () => _setAlignment('center')),
                _buildIconTextButton(Icons.format_align_right, "오른쪽", style.align == 'right', () => _setAlignment('right')),
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

  void _setAlignment(String alignOption) {
    onUpdate(style..align = alignOption);
    final attr = alignOption == 'center'
        ? Attribute.centerAlignment
        : alignOption == 'right'
            ? Attribute.rightAlignment
            : Attribute.leftAlignment;
    controller.formatText(0, controller.document.length, attr);
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

  // Required import for GoogleFonts to render the font preview
  TextStyle _getGoogleFont(String fontFamily, TextStyle base) {
    // This is a minimal mapper for the toolbar dropdown previews. 
    // It assumes google_fonts is already imported in this file. 
    // (We will add the import at the top of the file)
    switch (fontFamily) {
      case 'Black Han Sans': return GoogleFonts.blackHanSans(textStyle: base);
      case 'Do Hyeon': return GoogleFonts.doHyeon(textStyle: base);
      case 'Gowun Batang': return GoogleFonts.gowunBatang(textStyle: base);
      case 'Nanum Gothic': return GoogleFonts.nanumGothic(textStyle: base);
      case 'Sunflower': return GoogleFonts.sunflower(textStyle: base);
      case 'Jua': return GoogleFonts.jua(textStyle: base);
      case 'Hi Melody': return GoogleFonts.hiMelody(textStyle: base);
      case 'Gamja Flower': return GoogleFonts.gamjaFlower(textStyle: base);
      case 'Single Day': return GoogleFonts.singleDay(textStyle: base);
      case 'Noto Serif KR': return GoogleFonts.notoSerifKr(textStyle: base);
      default: return GoogleFonts.notoSansKr(textStyle: base);
    }
  }

  Widget _buildFontDropdown({
    required String value,
    required List<String> items,
    required Function(String?) onChanged,
  }) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.font_download, size: 16, color: Colors.grey[600]),
          SizedBox(width: 6),
          DropdownButton<String>(
            value: items.contains(value) ? value : items.first,
            // Replace the selected item text with "글씨체 바꾸기"
            selectedItemBuilder: (BuildContext context) {
              return items.map<Widget>((String item) {
                return Center(
                  child: Text(
                    "글씨체 바꾸기",
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[800],
                    ),
                  ),
                );
              }).toList();
            },
            items: items.map((item) {
              // Convert font names to Korean friendly names if desired, or just append Korean text
              String displayName = item;
              switch (item) {
                 case 'Noto Sans KR': displayName = '본고딕 (가나다라)'; break;
                 case 'Black Han Sans': displayName = '검은고딕 (가나다라)'; break;
                 case 'Do Hyeon': displayName = '도현체 (가나다라)'; break;
                 case 'Gowun Batang': displayName = '고운바탕 (가나다라)'; break;
                 case 'Nanum Gothic': displayName = '나눔고딕 (가나다라)'; break;
                 case 'Sunflower': displayName = '해바라기 (가나다라)'; break;
                 case 'Jua': displayName = '주아체 (가나다라)'; break;
                 case 'Hi Melody': displayName = '하이멜로디 (가나다라)'; break;
                 case 'Gamja Flower': displayName = '감자꽃 (가나다라)'; break;
                 case 'Single Day': displayName = '싱글데이 (가나다라)'; break;
                 case 'Noto Serif KR': displayName = '본명조 (가나다라)'; break;
                 default: displayName = '$item (가나다라)';
              }

              return DropdownMenuItem<String>(
                value: item,
                child: Text(
                  displayName,
                  // Render the actual font
                  style: _getGoogleFont(item, TextStyle(fontSize: 14, color: Colors.black87)),
                ),
              );
            }).toList(),
            onChanged: onChanged,
            underline: SizedBox(), // remove default underline
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
