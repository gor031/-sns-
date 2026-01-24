import 'package:flutter/material.dart';

class StyledTextEditingController extends TextEditingController {
  StyledTextEditingController({String? text}) : super(text: text);

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final List<InlineSpan> children = [];
    final String text = value.text;
    final TextStyle baseStyle = style ?? const TextStyle();
    final TextStyle hiddenStyle = baseStyle.copyWith(color: Colors.transparent, fontSize: 0.0, height: 0.0); // Completely hide 
    
    // Recursive parsing helper
    List<InlineSpan> _parseContent(String text, TextStyle currentStyle) {
      final List<InlineSpan> spans = [];
      // Regex for tags only, not full blocks to allow nesting
      // But simplifying: just recurse for the content inside valid blocks.
      // We'll reuse the same regex pattern concept.
      int i = 0;
      
      while (i < text.length) {
        // Find next potential tag
        int nextBold = text.indexOf('**', i);
        int nextHigh = text.indexOf('==', i);
        int nextColor = text.indexOf('<c:', i);
        
        List<int> indices = [nextBold, nextHigh, nextColor].where((idx) => idx != -1).toList();
        
        if (indices.isEmpty) {
          spans.add(TextSpan(text: text.substring(i), style: currentStyle));
          break;
        }
        
        indices.sort();
        int closest = indices.first;
        
        // Add text before tag
        if (closest > i) {
          spans.add(TextSpan(text: text.substring(i, closest), style: currentStyle));
        }
        
        if (closest == nextBold) {
           int end = text.indexOf('**', closest + 2);
           if (end != -1) {
             spans.add(TextSpan(text: '**', style: hiddenStyle));
             String content = text.substring(closest + 2, end);
             spans.addAll(_parseContent(content, currentStyle.copyWith(fontWeight: FontWeight.bold)));
             spans.add(TextSpan(text: '**', style: hiddenStyle));
             i = end + 2;
           } else {
             spans.add(TextSpan(text: '**', style: currentStyle));
             i = closest + 2;
           }
        } else if (closest == nextHigh) {
           int end = text.indexOf('==', closest + 2);
           if (end != -1) {
             spans.add(TextSpan(text: '==', style: hiddenStyle));
             String content = text.substring(closest + 2, end);
             spans.addAll(_parseContent(content, currentStyle.copyWith(backgroundColor: Colors.yellow.withOpacity(0.3), color: Colors.black87)));
             spans.add(TextSpan(text: '==', style: hiddenStyle));
             i = end + 2;
           } else {
             spans.add(TextSpan(text: '==', style: currentStyle));
             i = closest + 2;
           }
        } else if (closest == nextColor) {
           // Parse <c:#HEX>
           int tagClose = text.indexOf('>', closest);
           if (tagClose != -1) {
              String tag = text.substring(closest, tagClose + 1);
              String hex = tag.substring(3, tag.length - 1);
              
              // Nesting logic
              int depth = 1;
              int current = tagClose + 1;
              int contentEnd = -1;
               
              while (current < text.length) {
                 int open = text.indexOf('<c:', current);
                 int close = text.indexOf('</c>', current);
                 
                 if (close == -1) break; 
                 
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
                 // Determine Color
                 String hexClean = hex.replaceFirst('#', '');
                 if (hexClean.length == 3) hexClean = hexClean.split('').map((c) => '$c$c').join('');
                 else if (hexClean.length == 4) hexClean = hexClean.split('').map((c) => '$c$c').join('');
                 
                 Color color = Colors.black;
                 try {
                   if (hexClean.length == 6) {
                      color = Color(int.parse(hexClean, radix: 16) + 0xFF000000);
                   } else if (hexClean.length == 8) {
                      color = Color(int.parse(hexClean, radix: 16));
                   }
                 } catch (_) {}
                 
                 spans.add(TextSpan(text: tag, style: hiddenStyle));
                 String content = text.substring(tagClose + 1, contentEnd);
                 spans.addAll(_parseContent(content, currentStyle.copyWith(color: color)));
                 spans.add(TextSpan(text: '</c>', style: hiddenStyle));
                 i = contentEnd + 4;
              } else {
                 spans.add(TextSpan(text: tag, style: currentStyle));
                 i = tagClose + 1;
              }
           } else {
              spans.add(TextSpan(text: '<c:', style: currentStyle));
              i = closest + 3;
           }
        }
      }
      return spans;
    }

    children.addAll(_parseContent(text, baseStyle));

    return TextSpan(style: style, children: children);
  }
}
