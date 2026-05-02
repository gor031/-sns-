
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/card_news.dart';
import '../theme/card_theme.dart';

class CardPreview extends StatelessWidget {
  final Slide slide;
  final NewsCardThemeData theme;
  final bool isCover;
  final GlobalKey? captureKey;
  final VoidCallback? onHeaderTap;
  final VoidCallback? onBodyTap;
  final TextEditingController? headerController;
  final TextEditingController? bodyController;
  final FocusNode? headerFocus;
  final FocusNode? bodyFocus;
  final String? signature; // New field

  const CardPreview({
    Key? key,
    required this.slide,
    required this.theme,
    required this.isCover,
    this.captureKey,
    this.onHeaderTap,
    this.onBodyTap,
    this.headerController,
    this.bodyController,
    this.headerFocus,
    this.bodyFocus,
    this.signature,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      key: captureKey,
      child: AspectRatio(
        aspectRatio: 4 / 5,
        child: Container(
          width: double.infinity,
          decoration: theme.background,
          child: Stack(
            children: [
              // Blob 1
              Positioned(
                top: -100,
                right: -100,
                width: 300,
                height: 300,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [theme.blob1, Colors.transparent],
                    ),
                  ),
                ),
              ),
              // Blob 2
              Positioned(
                bottom: -50,
                left: -50,
                width: 250,
                height: 250,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [theme.blob2, Colors.transparent],
                    ),
                  ),
                ),
              ),
              // Content
              Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: isCover ? MainAxisAlignment.center : MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.start, // Default to start, rich text handles alignment
                  children: [
                    if (!isCover) ...[
                       Container(
                         height: 1,
                         width: double.infinity,
                         color: Colors.black.withOpacity(0.1),
                         margin: EdgeInsets.only(bottom: 24),
                       )
                    ],

                    if (isCover) ...[
                      Center(
                        child: Container(
                          width: 48,
                          height: 4,
                          color: theme.accentColor,
                          margin: EdgeInsets.only(bottom: 32),
                        ),
                      ),
                    ],

                    // Header
                    GestureDetector(
                      onTap: onHeaderTap,
                      child: Container(
                        width: double.infinity,
                        // If controller is provided, show editable field
                        child: headerController != null 
                            ? _buildEditableField(
                                controller: headerController!,
                                focusNode: headerFocus,
                                baseStyle: _getGoogleFont(
                                  slide.headerStyle?.fontFamily,
                                  TextStyle(
                                    fontSize: _parseFontSize(slide.headerStyle?.fontSize, isCover ? 36 : 28),
                                    fontWeight: FontWeight.bold,
                                    color: _parseColor(slide.headerStyle?.color) ?? theme.textColor,
                                    height: 1.3,
                                  ),
                                ),
                                align: _parseAlign(slide.headerStyle?.align, isCover ? TextAlign.center : TextAlign.left),
                                isHeader: true,
                              )
                            : _buildRichText(
                                text: slide.header,
                                customStyle: slide.headerStyle, 
                                defaultAlign: isCover ? TextAlign.center : TextAlign.left,
                                baseStyle: _getGoogleFont(
                                  slide.headerStyle?.fontFamily,
                                  TextStyle(
                                    fontSize: _parseFontSize(slide.headerStyle?.fontSize, isCover ? 36 : 28),
                                    fontWeight: FontWeight.bold,
                                    color: _parseColor(slide.headerStyle?.color) ?? theme.textColor, // Support custom color
                                    height: 1.3,
                                  ),
                                ),
                                isHeader: true,
                              ),
                      ),
                    ),

                    if (isCover)
                      Center(
                        child: Container(
                          width: 120,
                          height: 10,
                          decoration: theme.decoration.copyWith(borderRadius: BorderRadius.circular(10)),
                          margin: EdgeInsets.only(top: 32),
                        ),
                      ),

                    if (!isCover) ...[
                      SizedBox(height: 24),
                      Expanded(
                        child: GestureDetector(
                          onTap: onBodyTap,
                          child: Container(
                            width: double.infinity,
                            color: Colors.transparent,
                            child: bodyController != null
                                ? _buildEditableField(
                                    controller: bodyController!,
                                    focusNode: bodyFocus,
                                    baseStyle: _getGoogleFont(
                                      slide.bodyStyle?.fontFamily,
                                      TextStyle(
                                        fontSize: _parseFontSize(slide.bodyStyle?.fontSize, 22),
                                        fontWeight: FontWeight.w500,
                                        color: _parseColor(slide.bodyStyle?.color) ?? theme.textColor,
                                        height: 1.4,
                                      ),
                                    ),
                                    align: _parseAlign(slide.bodyStyle?.align, TextAlign.left),
                                    isHeader: false,
                                  )
                                : _buildRichText(
                                    text: slide.body,
                                    customStyle: slide.bodyStyle,
                                    defaultAlign: TextAlign.left,
                                    baseStyle: _getGoogleFont(
                                      slide.bodyStyle?.fontFamily,
                                      TextStyle(
                                        fontSize: _parseFontSize(slide.bodyStyle?.fontSize, 22),
                                        fontWeight: FontWeight.w500,
                                        color: _parseColor(slide.bodyStyle?.color) ?? theme.textColor,
                                        height: 1.4,
                                      ),
                                    ),
                                    isHeader: false,
                                  ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              
              if (signature != null && signature!.isNotEmpty)
                Positioned(
                  right: 16,
                  bottom: 16,
                  child: Text(
                    signature!,
                    style: GoogleFonts.notoSansKr(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: theme.textColor.withOpacity(0.5),
                      shadows: [
                        Shadow(color: Colors.black12, offset: Offset(1, 1), blurRadius: 2),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  // Parse custom hex color string to Color
  Color? _parseColor(String? colorStr) {
    if (colorStr == null || colorStr.isEmpty) return null;
    try {
      String hex = colorStr.replaceFirst('#', '');
      if (hex.length == 3) {
        hex = hex.split('').map((char) => '$char$char').join('');
      } else if (hex.length == 4) {
         hex = hex.split('').map((char) => '$char$char').join('');
      }
      
      if (hex.length == 6) {
        return Color(int.parse(hex, radix: 16) + 0xFF000000);
      } else if (hex.length == 8) {
        return Color(int.parse(hex, radix: 16));
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  TextStyle _getGoogleFont(String? fontFamily, TextStyle base) {
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
  
  // Parse 'text-3xl' etc to double, or return default
  double _parseFontSize(String? sizeStr, double defaultSize) {
    if (sizeStr == null || sizeStr.isEmpty) return defaultSize;
    
    // Support direct numeric strings (e.g. "24.0", "16")
    final numeric = double.tryParse(sizeStr);
    if (numeric != null) return numeric;

    switch(sizeStr) {
      case 'text-sm': return 14;
      case 'text-base': return 16;
      case 'text-lg': return 18;
      case 'text-xl': return 20;
      case 'text-2xl': return 24;
      case 'text-3xl': return 30;
      case 'text-4xl': return 36;
      case 'text-5xl': return 48;
      case 'text-6xl': return 60; 
      default: return defaultSize;
    }
  }

  TextAlign _parseAlign(String? align, TextAlign defaultAlign) {
    if (align == 'center') return TextAlign.center;
    if (align == 'right') return TextAlign.right;
    if (align == 'left') return TextAlign.left;
    return defaultAlign;
  }

  Widget _buildEditableField({
    required TextEditingController controller,
    required FocusNode? focusNode,
    required TextStyle baseStyle,
    required TextAlign align,
    required bool isHeader,
  }) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      style: baseStyle,
      textAlign: align,
      maxLines: null,
      decoration: InputDecoration(
        border: InputBorder.none,
        isDense: true,
        contentPadding: EdgeInsets.zero,
        hintText: isHeader ? "제목을 입력하세요" : "내용을 입력하세요",
        hintStyle: baseStyle.copyWith(color: Colors.grey.withOpacity(0.5)),
      ),
      // We rely on the StyledController for the 'rich' look in the edit field
    );
  }

  Widget _buildRichText({
    required String text, 
    required TextStyle baseStyle, 
    required bool isHeader,
    required TextAlign defaultAlign,
    CustomTextStyle? customStyle
  }) {
    List<InlineSpan> _parseSpans(String text, TextStyle currentStyle) {
      List<InlineSpan> spans = [];
      int i = 0;
      
      while (i < text.length) {
        // Find next potential tag
        int nextBold = text.indexOf('**', i);
        int nextHigh = text.indexOf('==', i);
        int nextColor = text.indexOf('<c:', i);
        
        // Filter out -1 (not found) and sort
        List<int> indices = [nextBold, nextHigh, nextColor].where((idx) => idx != -1).toList();
        
        if (indices.isEmpty) {
          // No more tags
          spans.add(TextSpan(text: text.substring(i), style: currentStyle));
          break;
        }
        
        indices.sort();
        int closest = indices.first;
        
        // Add text before the tag
        if (closest > i) {
          spans.add(TextSpan(text: text.substring(i, closest), style: currentStyle));
        }
        
        if (closest == nextBold) {
          int end = text.indexOf('**', closest + 2);
          if (end != -1) {
            String content = text.substring(closest + 2, end);
            spans.addAll(_parseSpans(content, currentStyle.copyWith(fontWeight: FontWeight.bold)));
            i = end + 2;
          } else {
            spans.add(TextSpan(text: '**', style: currentStyle));
            i = closest + 2;
          }
        } else if (closest == nextHigh) {
          int end = text.indexOf('==', closest + 2);
          if (end != -1) {
            String content = text.substring(closest + 2, end);
             spans.add(
              WidgetSpan(
                alignment: PlaceholderAlignment.middle,
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                  decoration: isHeader 
                      ? null 
                      : BoxDecoration(
                          color: theme.highlightBgColor,
                          borderRadius: BorderRadius.circular(4),
                        ),
                  child: Text.rich(
                    TextSpan(
                      children: _parseSpans(content, currentStyle.copyWith(
                        color: isHeader ? theme.accentColor : theme.highlightTextColor,
                        fontWeight: currentStyle.fontWeight == FontWeight.bold ? FontWeight.bold : FontWeight.w600,
                      )),
                    ),
                  ),
                ),
              ),
            );
            i = end + 2;
          } else {
            spans.add(TextSpan(text: '==', style: currentStyle));
            i = closest + 2;
          }
        } else if (closest == nextColor) {
          // Parse <c:#HEX>
          int tagClose = text.indexOf('>', closest);
          if (tagClose != -1) {
             String tag = text.substring(closest, tagClose + 1); // e.g. <c:#123>
             // Extract Hex
             String hex =  tag.substring(3, tag.length - 1);
             
             // Find closing </c> with nesting support
             int depth = 1;
             int current = tagClose + 1;
             int contentEnd = -1;
             
             while (current < text.length) {
                int open = text.indexOf('<c:', current);
                int close = text.indexOf('</c>', current);
                
                if (close == -1) break; // Unbalanced
                
                if (open != -1 && open < close) {
                   depth++;
                   current = open + 3;
                } else {
                   depth--;
                   if (depth == 0) {
                      contentEnd = close;
                      break;
                   }
                   current = close + 4;
                }
             }
             
             if (contentEnd != -1) {
                String content = text.substring(tagClose + 1, contentEnd);
                Color? color = _parseColor(hex);
                if (color != null) {
                   spans.addAll(_parseSpans(content, currentStyle.copyWith(color: color)));
                } else {
                   spans.addAll(_parseSpans(content, currentStyle));
                }
                i = contentEnd + 4; // Skip </c>
             } else {
                // Broken tag, treat as text
                spans.add(TextSpan(text: tag, style: currentStyle));
                i = tagClose + 1;
             }
          } else {
             // Malformed
             spans.add(TextSpan(text: '<c:', style: currentStyle));
             i = closest + 3;
          }
        }
      }
      return spans;
    }

    List<InlineSpan> spans = _parseSpans(text, baseStyle);

    return RichText(
      text: TextSpan(children: spans),
      textAlign: _parseAlign(customStyle?.align, defaultAlign),
    );
  }
}
