
class CustomTextStyle {
  String align;
  String fontSize;
  String color;
  String fontFamily; // New field

  CustomTextStyle({
    required this.align,
    required this.fontSize,
    required this.color,
    this.fontFamily = 'Noto Sans KR',
  });

  factory CustomTextStyle.fromJson(Map<String, dynamic> json) {
    return CustomTextStyle(
      align: json['align'] ?? 'left',
      fontSize: json['fontSize'] ?? '',
      color: json['color'] ?? '',
      fontFamily: json['fontFamily'] ?? 'Noto Sans KR',
    );
  }
}

class Slide {
  final int pageNumber;
  String header;
  String body;
  CustomTextStyle? headerStyle;
  CustomTextStyle? bodyStyle;

  Slide({
    required this.pageNumber,
    required this.header,
    required this.body,
    this.headerStyle,
    this.bodyStyle,
  });

  factory Slide.fromJson(Map<String, dynamic> json, int index) {
    bool isCover = (json['pageNumber'] ?? index + 1) == 1;
    
    return Slide(
      pageNumber: json['pageNumber'] ?? index + 1,
      header: json['header'] ?? '',
      body: json['body'] ?? '',
      headerStyle: json['headerStyle'] != null 
          ? CustomTextStyle.fromJson(json['headerStyle']) 
          : CustomTextStyle(
              align: isCover ? 'center' : 'left',
              fontSize: isCover ? 'text-4xl' : 'text-3xl', // Reduced default from 5xl
              color: '',
            ),
      bodyStyle: json['bodyStyle'] != null 
          ? CustomTextStyle.fromJson(json['bodyStyle']) 
          : CustomTextStyle(
              align: 'left',
              fontSize: 'text-2xl',
              color: '',
            ),
    );
  }
}

class CardNewsData {
  final String topic;
  final String targetAudience;
  final String tone;
  final List<String> hashtags;
  final List<Slide> slides;
  int? themeIndex;

  CardNewsData({
    required this.topic,
    required this.targetAudience,
    required this.tone,
    required this.hashtags,
    required this.slides,
    this.themeIndex,
  });

  factory CardNewsData.fromJson(Map<String, dynamic> json) {
    var rawSlides = json['slides'];
    List<Slide> parsedSlides = [];
    
    if (rawSlides is List) {
      parsedSlides = rawSlides.asMap().entries.map((entry) {
        return Slide.fromJson(entry.value, entry.key);
      }).toList();
    }

    return CardNewsData(
      topic: json['topic'] ?? '제목 없음',
      targetAudience: json['targetAudience'] ?? '전체',
      tone: json['tone'] ?? '기본',
      hashtags: (json['hashtags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      slides: parsedSlides,
      themeIndex: json['themeIndex'],
    );
  }
}
