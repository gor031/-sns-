
import 'dart:convert';
import '../models/card_news.dart';

class GeminiService {
  static String cleanJsonString(String text) {
    String cleanText = text;
    
    // Remove markdown code blocks
    cleanText = cleanText.replaceAll('```json', '').replaceAll('```', '');
    
    int jsonStart = cleanText.indexOf('{');
    int jsonArrayStart = cleanText.indexOf('[');
    
    if (jsonStart != -1 && (jsonArrayStart == -1 || jsonStart < jsonArrayStart)) {
      int jsonEnd = cleanText.lastIndexOf('}');
      if (jsonEnd != -1) {
        return cleanText.substring(jsonStart, jsonEnd + 1);
      }
    }
    
    return cleanText.trim();
  }

  static CardNewsData parseCardNewsJson(String input) {
    try {
      String cleaned = cleanJsonString(input);
      Map<String, dynamic> data = jsonDecode(cleaned);

      if (data['slides'] == null || (data['slides'] as List).isEmpty) {
        throw Exception("내용을 찾을 수 없습니다.");
      }

      return CardNewsData.fromJson(data);
    } catch (e) {
      print("Parse Error: $e");
      throw Exception("변환에 실패했습니다. AI가 써준 내용(JSON)을 정확히 복사했는지 확인해주세요.");
    }
  }
}
