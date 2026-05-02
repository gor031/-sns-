import 'package:dart_openai/dart_openai.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:convert';
import '../models/card_news.dart';

class OpenAIService {
  static void init() {
    OpenAI.apiKey = dotenv.env['OPENAI_API_KEY'] ?? '';
  }

  final List<OpenAIChatCompletionChoiceMessageModel> _messages = [];

  void addMessage(String role, String content) {
    if (role == 'system') {
      _messages.add(OpenAIChatCompletionChoiceMessageModel(
        role: OpenAIChatMessageRole.system,
        content: [OpenAIChatCompletionChoiceMessageContentItemModel.text(content)],
      ));
    } else if (role == 'user') {
      _messages.add(OpenAIChatCompletionChoiceMessageModel(
        role: OpenAIChatMessageRole.user,
        content: [OpenAIChatCompletionChoiceMessageContentItemModel.text(content)],
      ));
    } else if (role == 'assistant') {
      _messages.add(OpenAIChatCompletionChoiceMessageModel(
        role: OpenAIChatMessageRole.assistant,
        content: [OpenAIChatCompletionChoiceMessageContentItemModel.text(content)],
      ));
    }
  }

  Future<String> chat(String userMessage) async {
    addMessage('user', userMessage);

    final chatCompletion = await OpenAI.instance.chat.create(
      model: "gpt-4o", // Using gpt-4o as default
      messages: _messages,
    );

    final response = chatCompletion.choices.first.message.content?.first.text ?? "";
    addMessage('assistant', response);
    return response;
  }

  static String cleanJsonString(String text) {
    String cleanText = text;
    cleanText = cleanText.replaceAll('```json', '').replaceAll('```', '');
    int jsonStart = cleanText.indexOf('{');
    if (jsonStart != -1) {
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
      return CardNewsData.fromJson(data);
    } catch (e) {
      throw Exception("JSON 변환 실패: $e");
    }
  }
}
