
import 'package:flutter/material.dart';
import 'dart:math'; // For random generation

class NewsCardThemeData {
  final String id;
  final BoxDecoration background;
  final Color textColor;
  final Color accentColor;
  final Color highlightBgColor;
  final Color highlightTextColor;
  final BoxDecoration decoration;
  final Color blob1;
  final Color blob2;

  NewsCardThemeData({
    required this.id,
    required this.background,
    required this.textColor,
    required this.accentColor,
    required this.highlightBgColor,
    required this.highlightTextColor,
    required this.decoration,
    required this.blob1,
    required this.blob2,
  });
}

// Helper to parse hex colors
Color hex(String code) {
  return Color(int.parse(code.substring(1, 7), radix: 16) + 0xFF000000);
}

// Helper for RGBA strings like "rgba(255, 0, 85, 0.4)"
Color rgba(String code) {
  try {
    final parts = code.replaceAll('rgba(', '').replaceAll(')', '').split(',');
    if (parts.length != 4) return Colors.transparent;
    return Color.fromARGB(
      (double.parse(parts[3]) * 255).toInt(),
      int.parse(parts[0].trim()),
      int.parse(parts[1].trim()),
      int.parse(parts[2].trim()),
    );
  } catch (e) {
    return Colors.transparent;
  }
}

// Random Theme Generator
NewsCardThemeData generateRandomTheme() {
  final random = Random();
  
  // Helper to generate a nice random color with some saturation/value constraints
  Color getRandomColor({bool isDark = false}) {
    // HSV: Hue (0-360), Saturation (0.5-1.0), Value (0.4-1.0) for attractive colors
    final h = random.nextDouble() * 360;
    final s = 0.5 + random.nextDouble() * 0.5; // Avoid too washed out
    final v = isDark ? (0.1 + random.nextDouble() * 0.3) : (0.7 + random.nextDouble() * 0.3);
    return HSVColor.fromAHSV(1.0, h, s, v).toColor();
  }

  // Random Background: Solid or Gradient
  final bool isGradientBg = random.nextBool();
  final BoxDecoration bgDecoration;
  final Color baseColor = getRandomColor(isDark: true); // Dark backgrounds are popular/safe
  
  if (isGradientBg) {
    bgDecoration = BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [baseColor, getRandomColor(isDark: true)],
      ),
    );
  } else {
    bgDecoration = BoxDecoration(color: baseColor);
  }

  // Determine text color based on background brightness (simple check)
  // Contrast is key. If BG is dark, text is white.
  final bool isBgDark = baseColor.computeLuminance() < 0.5;
  final Color textColor = isBgDark ? Colors.white : Colors.black87;

  // Accent Color (for Highlights/Decorations) - Should pop
  final Color accentColor = getRandomColor(isDark: !isBgDark);
  
  // Highlight BG
  final Color highlightBg = accentColor.withOpacity(0.3);
  final Color highlightText = isBgDark ? accentColor : Colors.white;

  return NewsCardThemeData(
    id: 'random-${random.nextInt(10000)}',
    background: bgDecoration,
    textColor: textColor,
    accentColor: accentColor,
    highlightBgColor: isBgDark ? accentColor : highlightBg,
    highlightTextColor: isBgDark ? Colors.black : highlightText,
    decoration: BoxDecoration(color: accentColor.withOpacity(0.8)),
    blob1: accentColor.withOpacity(0.1 + random.nextDouble() * 0.2),
    blob2: getRandomColor(isDark: !isBgDark).withOpacity(0.1 + random.nextDouble() * 0.2),
  );
}

final List<NewsCardThemeData> appThemes = [
  NewsCardThemeData(id: 'neon-dark', background: BoxDecoration(color: hex('#111827')), textColor: Colors.white, accentColor: hex('#FF0055'), highlightBgColor: hex('#FF0055'), highlightTextColor: Colors.white, decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomLeft, end: Alignment.topRight, colors: [hex('#FF0055'), hex('#FF5588')])), blob1: rgba('rgba(255, 0, 85, 0.4)'), blob2: rgba('rgba(255, 85, 136, 0.3)')),
  NewsCardThemeData(id: 'clean-blue', background: BoxDecoration(color: Colors.white), textColor: hex('#111827'), accentColor: hex('#2962FF'), highlightBgColor: hex('#2962FF'), highlightTextColor: Colors.white, decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomLeft, end: Alignment.topRight, colors: [hex('#2962FF'), hex('#00B0FF')])), blob1: rgba('rgba(41, 98, 255, 0.15)'), blob2: rgba('rgba(0, 176, 255, 0.15)')),
  NewsCardThemeData(id: 'warm-emotional', background: BoxDecoration(color: hex('#FDFBF7')), textColor: hex('#4A403A'), accentColor: hex('#D84315'), highlightBgColor: hex('#FFCCBC'), highlightTextColor: hex('#BF360C'), decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [hex('#FFAB91'), hex('#FF7043')])), blob1: rgba('rgba(255, 171, 145, 0.4)'), blob2: rgba('rgba(255, 112, 67, 0.3)')),
  NewsCardThemeData(id: 'vibrant-purple', background: BoxDecoration(color: hex('#7000FF')), textColor: Colors.white, accentColor: hex('#00E5FF'), highlightBgColor: hex('#00E5FF'), highlightTextColor: Colors.black, decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft, colors: [hex('#D500F9'), hex('#651FFF')])), blob1: rgba('rgba(213, 0, 249, 0.4)'), blob2: rgba('rgba(101, 31, 255, 0.4)')),
  NewsCardThemeData(id: 'trust-green', background: BoxDecoration(color: hex('#004D40')), textColor: hex('#E0F2F1'), accentColor: hex('#FFD740'), highlightBgColor: hex('#FFD740'), highlightTextColor: hex('#004D40'), decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [hex('#00695C'), hex('#4DB6AC')])), blob1: rgba('rgba(0, 105, 92, 0.5)'), blob2: rgba('rgba(77, 182, 172, 0.4)')),
  NewsCardThemeData(id: 'midnight-gold', background: BoxDecoration(color: hex('#0F172A')), textColor: hex('#FFFBEB'), accentColor: hex('#FBBF24'), highlightBgColor: hex('#FBBF24'), highlightTextColor: hex('#0F172A'), decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: [hex('#FCD34D'), hex('#EAB308')])), blob1: rgba('rgba(251, 191, 36, 0.15)'), blob2: rgba('rgba(180, 83, 9, 0.15)')),
  NewsCardThemeData(id: 'sunset-gradient', background: BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [hex('#312E81'), hex('#6B21A8')])), textColor: Colors.white, accentColor: hex('#FDBA74'), highlightBgColor: hex('#FB923C'), highlightTextColor: Colors.white, decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: [hex('#FB923C'), hex('#EC4899')])), blob1: rgba('rgba(251, 146, 60, 0.3)'), blob2: rgba('rgba(236, 72, 153, 0.3)')),
  NewsCardThemeData(id: 'ocean-depths', background: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [hex('#1E3A8A'), hex('#0F172A')])), textColor: hex('#CFFAFE'), accentColor: hex('#22D3EE'), highlightBgColor: hex('#22D3EE'), highlightTextColor: hex('#1E3A8A'), decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [hex('#22D3EE'), hex('#3B82F6')])), blob1: rgba('rgba(34, 211, 238, 0.2)'), blob2: rgba('rgba(59, 130, 246, 0.2)')),
  NewsCardThemeData(id: 'forest-mist', background: BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [hex('#064E3B'), hex('#166534')])), textColor: hex('#ECFDF5'), accentColor: hex('#6EE7B7'), highlightBgColor: hex('#34D399'), highlightTextColor: hex('#064E3B'), decoration: BoxDecoration(color: hex('#10B981')), blob1: rgba('rgba(52, 211, 153, 0.2)'), blob2: rgba('rgba(16, 185, 129, 0.2)')),
  NewsCardThemeData(id: 'berry-smoothie', background: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomLeft, end: Alignment.topRight, colors: [hex('#EC4899'), hex('#F43F5E')])), textColor: Colors.white, accentColor: hex('#FEF08A'), highlightBgColor: Colors.white, highlightTextColor: hex('#E11D48'), decoration: BoxDecoration(color: hex('#FDE047')), blob1: rgba('rgba(255, 255, 255, 0.2)'), blob2: rgba('rgba(253, 224, 71, 0.3)')),
  NewsCardThemeData(id: 'minimal-mono', background: BoxDecoration(color: hex('#F3F4F6')), textColor: hex('#111827'), accentColor: Colors.black, highlightBgColor: Colors.black, highlightTextColor: Colors.white, decoration: BoxDecoration(color: hex('#1F2937')), blob1: rgba('rgba(0, 0, 0, 0.05)'), blob2: rgba('rgba(0, 0, 0, 0.08)')),
  NewsCardThemeData(id: 'minimal-dark', background: BoxDecoration(color: hex('#171717')), textColor: hex('#E5E5E5'), accentColor: Colors.white, highlightBgColor: Colors.white, highlightTextColor: Colors.black, decoration: BoxDecoration(color: hex('#404040')), blob1: rgba('rgba(255, 255, 255, 0.05)'), blob2: rgba('rgba(255, 255, 255, 0.03)')),
  NewsCardThemeData(id: 'paper-white', background: BoxDecoration(color: hex('#F5F5F5')), textColor: hex('#333333'), accentColor: Colors.black, highlightBgColor: hex('#333333'), highlightTextColor: Colors.white, decoration: BoxDecoration(color: hex('#999999')), blob1: rgba('rgba(0,0,0,0.03)'), blob2: rgba('rgba(0,0,0,0.03)')),
  NewsCardThemeData(id: 'soft-gray', background: BoxDecoration(color: hex('#E2E8F0')), textColor: hex('#1E293B'), accentColor: hex('#475569'), highlightBgColor: hex('#475569'), highlightTextColor: Colors.white, decoration: BoxDecoration(color: hex('#94A3B8')), blob1: rgba('rgba(71, 85, 105, 0.1)'), blob2: rgba('rgba(51, 65, 85, 0.1)')),
  NewsCardThemeData(id: 'high-contrast', background: BoxDecoration(color: Colors.black), textColor: hex('#FACC15'), accentColor: Colors.white, highlightBgColor: hex('#FACC15'), highlightTextColor: Colors.black, decoration: BoxDecoration(color: Colors.white), blob1: rgba('rgba(250, 204, 21, 0.1)'), blob2: rgba('rgba(255, 255, 255, 0.1)')),
  NewsCardThemeData(id: 'minty-fresh', background: BoxDecoration(color: hex('#ECFDF5')), textColor: hex('#064E3B'), accentColor: hex('#059669'), highlightBgColor: hex('#A7F3D0'), highlightTextColor: hex('#065F46'), decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomLeft, end: Alignment.topRight, colors: [hex('#34D399'), hex('#2DD4BF')])), blob1: rgba('rgba(52, 211, 153, 0.2)'), blob2: rgba('rgba(16, 185, 129, 0.2)')),
  NewsCardThemeData(id: 'soft-lavender', background: BoxDecoration(color: hex('#FAF5FF')), textColor: hex('#334155'), accentColor: hex('#9333EA'), highlightBgColor: hex('#E9D5FF'), highlightTextColor: hex('#6B21A8'), decoration: BoxDecoration(color: hex('#C084FC')), blob1: rgba('rgba(192, 132, 252, 0.2)'), blob2: rgba('rgba(168, 85, 247, 0.15)')),
  NewsCardThemeData(id: 'peach-fuzz', background: BoxDecoration(color: hex('#FFF7ED')), textColor: hex('#292524'), accentColor: hex('#F97316'), highlightBgColor: hex('#FED7AA'), highlightTextColor: hex('#7C2D12'), decoration: BoxDecoration(color: hex('#FB923C')), blob1: rgba('rgba(251, 146, 60, 0.2)'), blob2: rgba('rgba(253, 186, 116, 0.2)')),
  NewsCardThemeData(id: 'sky-blue', background: BoxDecoration(color: hex('#F0F9FF')), textColor: hex('#0C4A6E'), accentColor: hex('#0EA5E9'), highlightBgColor: hex('#BAE6FD'), highlightTextColor: hex('#075985'), decoration: BoxDecoration(color: hex('#38BDF8')), blob1: rgba('rgba(14, 165, 233, 0.1)'), blob2: rgba('rgba(56, 189, 248, 0.15)')),
  NewsCardThemeData(id: 'lemon-chiffon', background: BoxDecoration(color: hex('#FEFCE8')), textColor: hex('#713F12'), accentColor: hex('#CA8A04'), highlightBgColor: hex('#FEF08A'), highlightTextColor: hex('#854D0E'), decoration: BoxDecoration(color: hex('#FACC15')), blob1: rgba('rgba(250, 204, 21, 0.1)'), blob2: rgba('rgba(253, 224, 71, 0.15)')),
  NewsCardThemeData(id: 'retro-yellow', background: BoxDecoration(color: hex('#FACC15')), textColor: Colors.black, accentColor: hex('#DC2626'), highlightBgColor: Colors.black, highlightTextColor: hex('#FACC15'), decoration: BoxDecoration(color: hex('#EF4444')), blob1: rgba('rgba(0,0,0,0.1)'), blob2: rgba('rgba(239, 68, 68, 0.2)')),
  NewsCardThemeData(id: 'red-power', background: BoxDecoration(color: hex('#DC2626')), textColor: Colors.white, accentColor: hex('#FDE047'), highlightBgColor: Colors.white, highlightTextColor: hex('#DC2626'), decoration: BoxDecoration(color: hex('#FACC15')), blob1: rgba('rgba(255, 255, 255, 0.2)'), blob2: rgba('rgba(0, 0, 0, 0.2)')),
  NewsCardThemeData(id: 'orange-soda', background: BoxDecoration(color: hex('#F97316')), textColor: Colors.white, accentColor: hex('#FDE047'), highlightBgColor: Colors.white, highlightTextColor: hex('#F97316'), decoration: BoxDecoration(color: hex('#FACC15')), blob1: rgba('rgba(255, 255, 255, 0.3)'), blob2: rgba('rgba(252, 211, 77, 0.3)')),
  NewsCardThemeData(id: 'lime-punch', background: BoxDecoration(color: hex('#A3E635')), textColor: Colors.black, accentColor: hex('#1D4ED8'), highlightBgColor: hex('#2563EB'), highlightTextColor: Colors.white, decoration: BoxDecoration(color: hex('#3B82F6')), blob1: rgba('rgba(37, 99, 235, 0.2)'), blob2: rgba('rgba(29, 78, 216, 0.2)')),
  NewsCardThemeData(id: 'hot-pink', background: BoxDecoration(color: hex('#EC4899')), textColor: Colors.white, accentColor: hex('#BEF264'), highlightBgColor: hex('#BEF264'), highlightTextColor: hex('#DB2777'), decoration: BoxDecoration(color: hex('#A3E635')), blob1: rgba('rgba(190, 242, 100, 0.3)'), blob2: rgba('rgba(255, 255, 255, 0.2)')),
  NewsCardThemeData(id: 'deep-space', background: BoxDecoration(color: hex('#020617')), textColor: hex('#ECFEFF'), accentColor: hex('#22D3EE'), highlightBgColor: hex('#06B6D4'), highlightTextColor: hex('#0F172A'), decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: [hex('#06B6D4'), hex('#3B82F6')])), blob1: rgba('rgba(6, 182, 212, 0.15)'), blob2: rgba('rgba(59, 130, 246, 0.15)')),
  NewsCardThemeData(id: 'cyberpunk', background: BoxDecoration(color: Colors.black), textColor: hex('#F0FDF4'), accentColor: hex('#4ADE80'), highlightBgColor: hex('#22C55E'), highlightTextColor: Colors.black, decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: [hex('#4ADE80'), hex('#A3E635')])), blob1: rgba('rgba(74, 222, 128, 0.3)'), blob2: rgba('rgba(132, 204, 22, 0.2)')),
  NewsCardThemeData(id: 'vampire-red', background: BoxDecoration(color: hex('#2A0A0A')), textColor: hex('#FEE2E2'), accentColor: hex('#EF4444'), highlightBgColor: hex('#DC2626'), highlightTextColor: Colors.black, decoration: BoxDecoration(color: hex('#B91C1C')), blob1: rgba('rgba(220, 38, 38, 0.2)'), blob2: rgba('rgba(153, 27, 27, 0.3)')),
  NewsCardThemeData(id: 'indigo-night', background: BoxDecoration(color: hex('#1E1B4B')), textColor: hex('#E0E7FF'), accentColor: hex('#F472B6'), highlightBgColor: hex('#EC4899'), highlightTextColor: Colors.white, decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: [hex('#EC4899'), hex('#A855F7')])), blob1: rgba('rgba(236, 72, 153, 0.2)'), blob2: rgba('rgba(99, 102, 241, 0.2)')),
  NewsCardThemeData(id: 'galaxy-void', background: BoxDecoration(color: hex('#0F172A')), textColor: hex('#F3E8FF'), accentColor: hex('#C084FC'), highlightBgColor: hex('#9333EA'), highlightTextColor: Colors.white, decoration: BoxDecoration(color: hex('#A855F7')), blob1: rgba('rgba(168, 85, 247, 0.2)'), blob2: rgba('rgba(192, 132, 252, 0.1)')),
  NewsCardThemeData(id: 'corporate-blue', background: BoxDecoration(color: hex('#1E3A8A')), textColor: Colors.white, accentColor: hex('#BFDBFE'), highlightBgColor: Colors.white, highlightTextColor: hex('#1E3A8A'), decoration: BoxDecoration(color: hex('#60A5FA')), blob1: rgba('rgba(96, 165, 250, 0.2)'), blob2: rgba('rgba(37, 99, 235, 0.2)')),
  NewsCardThemeData(id: 'slate-teal', background: BoxDecoration(color: hex('#1E293B')), textColor: hex('#F1F5F9'), accentColor: hex('#2DD4BF'), highlightBgColor: hex('#14B8A6'), highlightTextColor: hex('#0F172A'), decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomLeft, end: Alignment.topRight, colors: [hex('#2DD4BF'), hex('#34D399')])), blob1: rgba('rgba(45, 212, 191, 0.2)'), blob2: rgba('rgba(52, 211, 153, 0.2)')),
  NewsCardThemeData(id: 'navy-gold', background: BoxDecoration(color: hex('#172554')), textColor: hex('#E2E8F0'), accentColor: hex('#EAB308'), highlightBgColor: hex('#EAB308'), highlightTextColor: Colors.white, decoration: BoxDecoration(color: hex('#A16207')), blob1: rgba('rgba(234, 179, 8, 0.2)'), blob2: rgba('rgba(30, 58, 138, 0.5)')),
  NewsCardThemeData(id: 'steel-gray', background: BoxDecoration(color: hex('#4B5563')), textColor: Colors.white, accentColor: hex('#D1D5DB'), highlightBgColor: hex('#D1D5DB'), highlightTextColor: hex('#1F2937'), decoration: BoxDecoration(color: hex('#9CA3AF')), blob1: rgba('rgba(255, 255, 255, 0.1)'), blob2: rgba('rgba(0, 0, 0, 0.2)')),
  NewsCardThemeData(id: 'executive', background: BoxDecoration(color: hex('#1C1C1C')), textColor: hex('#E5E5E5'), accentColor: Colors.white, highlightBgColor: Colors.white, highlightTextColor: Colors.black, decoration: BoxDecoration(color: hex('#6B7280')), blob1: rgba('rgba(255, 255, 255, 0.05)'), blob2: rgba('rgba(255, 255, 255, 0.05)')),
  NewsCardThemeData(id: 'forest-calm', background: BoxDecoration(color: hex('#2C3E2D')), textColor: hex('#E8F5E9'), accentColor: hex('#A5D6A7'), highlightBgColor: hex('#A5D6A7'), highlightTextColor: hex('#1B5E20'), decoration: BoxDecoration(color: hex('#81C784')), blob1: rgba('rgba(165, 214, 167, 0.15)'), blob2: rgba('rgba(200, 230, 201, 0.1)')),
  NewsCardThemeData(id: 'coffee-house', background: BoxDecoration(color: hex('#3E2723')), textColor: hex('#EFEBE9'), accentColor: hex('#D7CCC8'), highlightBgColor: hex('#A1887F'), highlightTextColor: Colors.white, decoration: BoxDecoration(color: hex('#8D6E63')), blob1: rgba('rgba(215, 204, 200, 0.1)'), blob2: rgba('rgba(161, 136, 127, 0.1)')),
  NewsCardThemeData(id: 'sand-dune', background: BoxDecoration(color: hex('#D7CCC8')), textColor: hex('#3E2723'), accentColor: hex('#5D4037'), highlightBgColor: hex('#5D4037'), highlightTextColor: hex('#D7CCC8'), decoration: BoxDecoration(color: hex('#795548')), blob1: rgba('rgba(62, 39, 35, 0.1)'), blob2: rgba('rgba(93, 64, 55, 0.1)')),
  NewsCardThemeData(id: 'olive-garden', background: BoxDecoration(color: hex('#556B2F')), textColor: hex('#FFFFF0'), accentColor: hex('#808000'), highlightBgColor: hex('#6B8E23'), highlightTextColor: Colors.white, decoration: BoxDecoration(color: hex('#9ACD32')), blob1: rgba('rgba(154, 205, 50, 0.2)'), blob2: rgba('rgba(107, 142, 35, 0.3)')),
  NewsCardThemeData(id: 'ocean-breeze', background: BoxDecoration(color: hex('#ECFEFF')), textColor: hex('#164E63'), accentColor: hex('#0891B2'), highlightBgColor: hex('#BAE6FD'), highlightTextColor: hex('#155E75'), decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: [hex('#22D3EE'), hex('#60A5FA')])), blob1: rgba('rgba(34, 211, 238, 0.2)'), blob2: rgba('rgba(6, 182, 212, 0.15)')),
  NewsCardThemeData(id: 'royal-luxury', background: BoxDecoration(color: hex('#18181B')), textColor: hex('#FFF7ED'), accentColor: hex('#EAB308'), highlightBgColor: hex('#CA8A04'), highlightTextColor: Colors.black, decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: [hex('#EAB308'), hex('#FEF08A')])), blob1: rgba('rgba(234, 179, 8, 0.15)'), blob2: rgba('rgba(250, 204, 21, 0.1)')),
  NewsCardThemeData(id: 'rose-gold', background: BoxDecoration(color: hex('#B76E79')), textColor: Colors.white, accentColor: hex('#FFD700'), highlightBgColor: Colors.white, highlightTextColor: hex('#B76E79'), decoration: BoxDecoration(color: hex('#E6C2C9')), blob1: rgba('rgba(255, 215, 0, 0.2)'), blob2: rgba('rgba(255, 255, 255, 0.2)')),
  NewsCardThemeData(id: 'platinum', background: BoxDecoration(color: hex('#E5E4E2')), textColor: hex('#1E293B'), accentColor: hex('#64748B'), highlightBgColor: hex('#94A3B8'), highlightTextColor: Colors.white, decoration: BoxDecoration(color: hex('#CBD5E1')), blob1: rgba('rgba(100, 116, 139, 0.1)'), blob2: rgba('rgba(148, 163, 184, 0.1)')),
  NewsCardThemeData(id: 'champagne', background: BoxDecoration(color: hex('#F7E7CE')), textColor: hex('#5C4033'), accentColor: hex('#C2B280'), highlightBgColor: hex('#C2B280'), highlightTextColor: Colors.white, decoration: BoxDecoration(color: hex('#D4C494')), blob1: rgba('rgba(194, 178, 128, 0.2)'), blob2: rgba('rgba(92, 64, 51, 0.1)')),
  NewsCardThemeData(id: 'ruby', background: BoxDecoration(color: hex('#9B111E')), textColor: Colors.white, accentColor: hex('#FFD700'), highlightBgColor: hex('#FFD700'), highlightTextColor: hex('#9B111E'), decoration: BoxDecoration(color: hex('#E0115F')), blob1: rgba('rgba(255, 215, 0, 0.2)'), blob2: rgba('rgba(255, 255, 255, 0.1)')),
  NewsCardThemeData(id: 'bubblegum', background: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [hex('#93C5FD'), hex('#F9A8D4')])), textColor: Colors.white, accentColor: hex('#9333EA'), highlightBgColor: Colors.white, highlightTextColor: hex('#EC4899'), decoration: BoxDecoration(color: hex('#C084FC')), blob1: rgba('rgba(255, 255, 255, 0.4)'), blob2: rgba('rgba(236, 72, 153, 0.3)')),
  NewsCardThemeData(id: 'tropical-punch', background: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomLeft, end: Alignment.topRight, colors: [hex('#4ADE80'), hex('#3B82F6')])), textColor: Colors.white, accentColor: hex('#FEF08A'), highlightBgColor: Colors.white, highlightTextColor: hex('#16A34A'), decoration: BoxDecoration(color: hex('#FACC15')), blob1: rgba('rgba(253, 224, 71, 0.3)'), blob2: rgba('rgba(255, 255, 255, 0.2)')),
  NewsCardThemeData(id: 'cherry-blossom', background: BoxDecoration(color: hex('#FDF2F8')), textColor: hex('#831843'), accentColor: hex('#EC4899'), highlightBgColor: hex('#FBCFE8'), highlightTextColor: hex('#BE185D'), decoration: BoxDecoration(color: hex('#F9A8D4')), blob1: rgba('rgba(244, 114, 182, 0.2)'), blob2: rgba('rgba(251, 207, 232, 0.4)')),
  NewsCardThemeData(id: 'grape-soda', background: BoxDecoration(color: hex('#6B21A8')), textColor: hex('#F3E8FF'), accentColor: hex('#F0ABFC'), highlightBgColor: hex('#E879F9'), highlightTextColor: hex('#581C87'), decoration: BoxDecoration(color: hex('#A855F7')), blob1: rgba('rgba(232, 121, 249, 0.2)'), blob2: rgba('rgba(192, 132, 252, 0.2)')),
  NewsCardThemeData(id: 'pastel-dream', background: BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [hex('#FCE7F3'), hex('#F3E8FF'), hex('#E0E7FF')])), textColor: hex('#334155'), accentColor: hex('#EC4899'), highlightBgColor: hex('#FBCFE8'), highlightTextColor: hex('#9D174D'), decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: [hex('#F9A8D4'), hex('#D8B4FE')])), blob1: rgba('rgba(244, 114, 182, 0.2)'), blob2: rgba('rgba(251, 207, 232, 0.2)')),
];
