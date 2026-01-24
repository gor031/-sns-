
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';

import 'package:gal/gal.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import '../services/ad_service.dart';
import 'dart:io';
import '../models/card_news.dart';
import '../services/gemini_service.dart';
import '../theme/card_theme.dart';
import '../widgets/card_preview.dart';
import '../widgets/rich_text_toolbar.dart';
import '../widgets/styled_text_controller.dart'; // New Import

const String SYSTEM_PROMPT = """
당신은 '숏폼/카드뉴스 콘텐츠 전문 마케터'입니다.
모바일 환경은 가독성이 생명입니다. 사용자가 주제를 던지면 무조건 **짧고, 강렬하고, 직관적인** 원고를 작성해야 합니다.

당신의 작업은 반드시 다음 **3단계 프로세스**를 따라야 합니다.

---

### [1단계: sns 올릴 제목과 내용]
사용자가 주제나 키워드를 입력하면 sns에 올릴 제목과 내용을 먼저생성해줘(반드시 복사 버튼으로 한번에 복사가 가능하게 해줘야되)

### [2단계: 원고 기획 및 컨펌]
제목과 내용 생성한 뒤에, 바로 JSON을 만들지 말고 먼저 **텍스트 원고**를 작성하여 보여주세요.

**1. 작성 원칙 (매우 중요):**
- **다이어트**: 불필요한 조사, 형용사, 부사를 모두 삭제하세요.
- **길이 제한**: 한 슬라이드당 **최대 2문장**을 넘기지 마세요. (이미지가 텍스트를 압도하지 않게)
- **구조**: 
   - 표지 (후킹 제목)
   - 본문 (6~10장 내외, 핵심 정보만 딱딱 끊어서)
   - 결론 (행동 유도)
- **강조 표시**: 핵심 단어는 **강조** 처리를 미리 해서 보여주세요.

**2. 마무리 멘트:**
원고 끝에 반드시 **"이 내용으로 카드뉴스 데이터를 생성할까요?"** 라고 물어보세요.

---

### [3단계: JSON 데이터 변환]
사용자가 "좋아", "만들어줘", "진행해"라고 동의하면, 위에서 확정된 원고를 **앱이 인식할 수 있는 JSON 코드**로 변환해서 출력하세요.

**1. 필수 규칙:**
- 서론/결론 없이 **오직 JSON 코드만** 출력하세요.
- 반드시 Markdown 코드 블록(```json)으로 감싸야 합니다.

**2. 데이터 구조 (변형 금지):**
```json
{
  "topic": "주제",
  "targetAudience": "타겟",
  "tone": "어조",
  "hashtags": ["태그1", "태그2"],
  "slides": [
    {
      "pageNumber": 1,
      "header": "표지 제목(짧고 굵게) **강조**",
      "body": "" 
    },
    {
      "pageNumber": 2,
      "header": "소제목(핵심만)",
      "body": "본문은 최대 2줄.\\n줄바꿈을 적극 활용.\\n**핵심** 단어 강조."
    }
  ]
}
```""";

enum InputMode { json, manual }

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _inputController = TextEditingController();
  CardNewsData? _cardData;
  NewsCardThemeData? _generatedTheme; // State for random theme
  int _currentThemeIndex = 0;
  int _currentPageIndex = 0; // Track active page for toolbar
  PageController _pageController = PageController(viewportFraction: 0.9);
  bool _isLoading = false;
  bool _showGuide = false;
  
  // Keys for capturing images
  List<GlobalKey> _slideKeys = [];
  List<GlobalKey> _exportSlideKeys = []; // Keys for off-screen export widgets

  // Manual Input State
  final TextEditingController _signatureController = TextEditingController(); // New
  InputMode _inputMode = InputMode.json;
  final List<Map<String, TextEditingController>> _manualInputs = [
    {'header': TextEditingController(text: '표지 제목'), 'body': TextEditingController(text: '')}, // Default Cover
    {'header': TextEditingController(), 'body': TextEditingController()}, // Default Page 1
  ];

  // Inline Editing State
  int? _editingSlideIndex;
  String? _editingField; // 'header' or 'body'
  // int? _editingSlideIndex; // Removed, now managed by page controller
  // String? _editingField; // Removed
  // late TextEditingController _inlineEditController; // Removed
  final FocusNode _inlineFocusNode = FocusNode();

  // Ad State
  BannerAd? _bannerAd;
  bool _isBannerAdLoaded = false;
  // Direct Editing Controllers (Styled)
  StyledTextEditingController? _headerController;
  StyledTextEditingController? _bodyController;
  final FocusNode _headerFocus = FocusNode();
  final FocusNode _bodyFocus = FocusNode();
  TextEditingController? _activeController; // For toolbar
  final AdService _adService = AdService();

  @override
  void initState() {
    super.initState();
    // Initialize focus listeners to update active controller
    _headerFocus.addListener(() {
      if (_headerFocus.hasFocus) setState(() => _activeController = _headerController);
    });
    _bodyFocus.addListener(() {
      if (_bodyFocus.hasFocus) setState(() => _activeController = _bodyController);
    });
    
    // Load Banner Ad
    _bannerAd = _adService.createBannerAd()..load().then((value) {
        setState(() {
            _isBannerAdLoaded = true;
        });
    });

    // Initialize controllers for the initial page if data loaded
    if (_cardData != null && _cardData!.slides.isNotEmpty) {
      _initControllersForPage(0);
    }
  }

  void _initControllersForPage(int pageIndex) {
    if (_cardData == null || pageIndex >= _cardData!.slides.length) return;
    
    final slide = _cardData!.slides[pageIndex];
    
    _headerController?.dispose();
    _bodyController?.dispose();

    _headerController = StyledTextEditingController(text: slide.header);
    _bodyController = StyledTextEditingController(text: slide.body);

    // Sync back to data model on change
    _headerController!.addListener(() {
      _cardData!.slides[pageIndex].header = _headerController!.text;
    });
    _bodyController!.addListener(() {
      _cardData!.slides[pageIndex].body = _bodyController!.text;
    });
  }

  void _handlePageChange(int index) {
    setState(() {
      _currentPageIndex = index; // Update active page index
      // _currentThemeIndex = index % appThemes.length; // Don't auto-cycle theme
      _initControllersForPage(index); // Re-bind controllers to new slide
      
      FocusScope.of(context).unfocus();
      _activeController = null;
    });
  }

  @override
  void dispose() {
    _inputController.dispose();
    _pageController.dispose();
    // _inlineEditController.dispose(); // Removed
    _inlineFocusNode.dispose();
    // for (var input in _manualInputs) { // Removed
    //   input['header']?.dispose();
    //   input['body']?.dispose();
    // }
    _headerController?.dispose();
    _bodyController?.dispose();
    _headerFocus.dispose();
    _bodyFocus.dispose();
    _bannerAd?.dispose();
    super.dispose();
  }

  // void _onInlineTextChanged() { // Removed
  //   if (_editingSlideIndex == null || _editingField == null || _cardData == null) return;

  //   setState(() {
  //     if (_editingField == 'header') {
  //       _cardData!.slides[_editingSlideIndex!].header = _inlineEditController.text;
  //     } else {
  //       _cardData!.slides[_editingSlideIndex!].body = _inlineEditController.text;
  //     }
  //   });
  // }

  // void _onPreviewTextTapped(int index, String field) { // Removed
  //   setState(() {
  //     _editingSlideIndex = index;
  //     _editingField = field;
      
  //     final slide = _cardData!.slides[index];
  //     _inlineEditController.text = field == 'header' ? slide.header : slide.body;
      
  //     // Move cursor to end
  //     _inlineEditController.selection = TextSelection.fromPosition(
  //       TextPosition(offset: _inlineEditController.text.length)
  //     );
  //   });
    
  //   // Request focus after build
  //   WidgetsBinding.instance.addPostFrameCallback((_) {
  //     FocusScope.of(context).requestFocus(_inlineFocusNode);
  //   });
  // }

  // void _onStyleUpdated(CustomTextStyle newStyle) { // Removed
  //   if (_editingSlideIndex == null || _editingField == null || _cardData == null) return;
  //   setState(() {
  //     // The style object is reference types, so it might be updated in place, 
  //     // but we call setState to trigger rebuild of Preview.
  //     // If the toolbar creates a NEW object, we need to assign it.
  //     // But RichTextToolbar usually mutates the passed style object or returns a new one.
  //     // Our previous implementation of RichTextToolbar calls onUpdate(style..property=val), mutating it.
  //     // So setState is enough.
  //   });
  // }

  Future<void> _checkLimitAndGenerate(VoidCallback generationLogic) async {
    final remaining = await _adService.getRemainingFreeUsage();
    
    if (remaining > 0) {
      // Has free quota
      await _adService.incrementUsage();
      generationLogic();
    } else {
      // Quota exceeded - Ask for Ad
        showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => AlertDialog(
                title: Text("무료 사용량 소진 (3/3)"),
                content: Text("오늘의 무료 생성 횟수를 모두 사용했습니다.\n광고를 시청하면 카드를 계속 생성할 수 있습니다!"),
                actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text("취소"),
                    ),
                    ElevatedButton(
                        onPressed: () async {
                            Navigator.pop(context); // Close dialog
                            print("HomeScreen: User clicked watch ad");
                            final earned = await _adService.showRewardedAd(context);
                            print("HomeScreen: Ad completed. Earned: $earned");
                            
                            if (earned) {
                                print("HomeScreen: Executing generation logic");
                                generationLogic();
                            } else {
                                print("HomeScreen: Reward not earned");
                                ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text("광고 보상을 받지 못했습니다. 끝까지 시청해주세요.")),
                                );
                            }
                        },
                        child: Text("광고 보고 생성하기"),
                    )
                ],
            )
        );
    }
  }

  void _parseJson() {
    if (_inputController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('JSON 데이터를 입력해주세요!')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final data = GeminiService.parseCardNewsJson(_inputController.text);
      if (data.themeIndex == null) {
        data.themeIndex = 0;
      }
      
      setState(() {
        _cardData = data;
        _currentThemeIndex = data.themeIndex! % appThemes.length;
        _slideKeys = List.generate(data.slides.length, (_) => GlobalKey());
        _exportSlideKeys = List.generate(data.slides.length, (_) => GlobalKey());
        _isLoading = false;
      });
      _initControllersForPage(0); // Initialize controllers for the first page after data is parsed
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('변환 실패: 올바른 JSON 형식이 아닙니다.\n$e'), 
          backgroundColor: Colors.red,
          duration: Duration(seconds: 4),
        ),
      );
    }
  }

  void _loadSample() {
     const sample = '''
```json
{
  "topic": "사용자 테스트",
  "targetAudience": "크리에이터",
  "tone": "친절함",
  "hashtags": ["꿀팁", "카드뉴스"],
  "slides": [
    {
      "pageNumber": 1,
      "header": "주제만 던지면\\n**원고부터 디자인**까지?",
      "body": ""
    },
    {
      "pageNumber": 2,
      "header": "1. Flutter 앱으로 변신",
      "body": "React에서 발생하던 **빌드 문제**를 해결하기 위해 네이티브 앱으로 다시 태어났습니다."
    },
    {
      "pageNumber": 3,
      "header": "2. 강력한 성능",
      "body": "이제 훨씬 **부드럽고 빠른** 속도로 카드뉴스를 제작할 수 있습니다."
    }
  ]
}
```
''';
    _inputController.text = sample;
  }
  
  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data?.text != null) {
      setState(() {
        _inputController.text = data!.text!;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('붙여넣기 완료!')),
      );
    }
  }

  // Save to Gallery
  Future<void> _saveToGallery(int index) async {
  FocusScope.of(context).unfocus(); // Hide keyboard/cursor
  try {
      final file = await _captureSlide(index);
      if (file != null) {
        await Gal.putImage(file.path);
        if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("갤러리에 저장되었습니다!")));
        }
      }
    } on GalException catch (e) {
       ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("저장 실패 (접근 권한 등): ${e.type}")));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("저장 오류: $e")));
    }
  }

  Future<void> _saveAllToGallery() async {
  FocusScope.of(context).unfocus(); // Hide keyboard/cursor
  try {
      setState(() => _isLoading = true);
      int successCount = 0;
      
      // Small delay to ensure layout is settled if just generated
      await Future.delayed(Duration(milliseconds: 100));

      for (int i = 0; i < _exportSlideKeys.length; i++) {
        await Future.delayed(Duration(milliseconds: 50)); // Breathe between saves
        final file = await _captureSlide(i, keys: _exportSlideKeys);
        if (file != null) {
          try {
            await Gal.putImage(file.path);
            successCount++;
          } catch(e) {
            print("Error saving slide $i: $e");
          }
        }
      }

      if (successCount > 0) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$successCount장의 슬라이드가 갤러리에 저장되었습니다!")));
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("저장에 실패했습니다.")));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("전체 저장 오류: $e")));
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
  
  Future<File?> _captureSlide(int index, {List<GlobalKey>? keys}) async {
    final key = (keys ?? _slideKeys)[index];
    if (key.currentContext == null) return null;
    
    RenderRepaintBoundary? boundary = key.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) return null;

    ui.Image image = await boundary.toImage(pixelRatio: 3.0);
    ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    if (byteData == null) return null; // Handle null explicitly
    Uint8List pngBytes = byteData.buffer.asUint8List();

    final tempDir = await getTemporaryDirectory();
    final file = await File('${tempDir.path}/card_v3_${index + 1}.png').create();
    await file.writeAsBytes(pngBytes);
    return file; 
  }


  void _toggleGuide() {
    setState(() {
      _showGuide = !_showGuide;
    });
  }

  Future<void> _copySystemPrompt() async {
    await Clipboard.setData(ClipboardData(text: SYSTEM_PROMPT));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('프롬프트가 복사되었습니다!'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Widget _buildGuideSection() {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          InkWell(
            onTap: _toggleGuide,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24), bottom: _showGuide ? Radius.zero : Radius.circular(24)),
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    padding: EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
                    child: Icon(Icons.help_outline, color: Colors.blue, size: 20),
                  ),
                  SizedBox(width: 12),
                  Text('사용 방법', style: GoogleFonts.notoSansKr(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.grey.shade800)),
                  Spacer(),
                  Icon(_showGuide ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: Colors.grey.shade400),
                ],
              ),
            ),
          ),
          if (_showGuide)
            Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: Column(
                children: [
                  Divider(height: 1, color: Colors.grey.shade100),
                  SizedBox(height: 20),
                  
                  if (_inputMode == InputMode.json) ...[
                    _buildGuideStep(1, 'Gems / GPTs 생성', 'AI 서비스의 "나만의 봇" 만들기 페이지로 이동합니다.'),
                    SizedBox(height: 20),
                    _buildGuideStep(2, '지시사항(Prompt) 입력', 'AI 설정의 "지시사항" 칸에 아래 내용을 복사해서 붙여넣으세요.'),
                    SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade900,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            SYSTEM_PROMPT,
                            maxLines: 5,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.sourceCodePro(color: Colors.grey.shade300, fontSize: 12),
                          ),
                          SizedBox(height: 12),
                          Align(
                            alignment: Alignment.centerRight,
                            child: ElevatedButton.icon(
                              onPressed: _copySystemPrompt,
                              icon: Icon(Icons.copy, size: 14),
                              label: Text('프롬프트 복사'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: Colors.black,
                                textStyle: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 20),
                    _buildGuideStep(3, '주제 입력', '봇에게 주제를 던지면 3단계 프로세스에 맞춰 결과를 생성합니다. 마지막 JSON 데이터를 복사해 아래에 붙여넣으세요.'),
                    
                  ] else ...[
                     _buildGuideStep(1, '표지 작성', '첫 번째 페이지는 카드뉴스의 표지입니다. 시선을 사로잡는 제목을 입력해 주세요.'),
                     SizedBox(height: 20),
                     _buildGuideStep(2, '페이지 추가', '"+ 페이지 추가하기" 버튼을 눌러 슬라이드를 늘리고, 각 슬라이드의 소제목과 본문을 작성하세요.'),
                     SizedBox(height: 20),
                     _buildGuideStep(3, '생성 하기', '작성을 마쳤다면 하단의 "카드뉴스 바로 생성하기" 버튼을 눌러 결과물을 확인하세요.'),
                  ],

                  SizedBox(height: 20),
                  _buildGuideStep(_inputMode == InputMode.json ? 4 : 4, '직접 편집 & 스타일링', '미리보기 화면의 텍스트를 터치하여 수정하세요. 드래그해서 선택하면 굵게, 강조, 색상 툴바가 나타납니다.'),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildGuideStep(int number, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: Colors.black, shape: BoxShape.circle),
          child: Text('$number', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
        ),
        SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: GoogleFonts.notoSansKr(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey.shade900)),
              SizedBox(height: 4),
              Text(description, style: GoogleFonts.notoSansKr(fontSize: 13, color: Colors.grey.shade600, height: 1.5)),
            ],
          ),
        ),
      ],
    );
  }





  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[200], // Darker gray for better contrast
      appBar: AppBar(
        title: Text('카드뉴스 생성기', style: GoogleFonts.notoSansKr(fontWeight: FontWeight.w900, color: Colors.black)),
        centerTitle: false,
        backgroundColor: Colors.white,
        elevation: 1,
        actions: [
           IconButton(
            icon: Icon(Icons.refresh, color: Colors.grey[800]),
            tooltip: '초기화',
            onPressed: () {
              setState(() {
                 _cardData = null;
                 _inputController.clear();
                 _headerController?.dispose();
                 _bodyController?.dispose();
                 _headerController = null;
                 _bodyController = null;
                 _activeController = null;
              });
            },
           ),
        ],
      ),
      body: Stack(
        children: [
          // Export View (Behind everything, translated off-screen)
          if (_cardData != null)
            Transform.translate(
              offset: Offset(-20000, 0), // Move far off-screen
              child: SingleChildScrollView(
                child: Column(
                  children: List.generate(_cardData!.slides.length, (index) {
                     return RepaintBoundary(
                        key: _exportSlideKeys[index],
                        child: CardPreview(
                          slide: _cardData!.slides[index],
                          theme: _generatedTheme ?? appThemes[_currentThemeIndex],
                          isCover: index == 0,
                          headerController: null, // Read-only for export
                          bodyController: null,
                          signature: _signatureController.text,
                        ),
                     );
                  }),
                ),
              ),
            ),
            
          Column(
            children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // Custom App Bar / Header
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                    color: Colors.white,
                    child: Row(
                      children: [
                        Container(
                          padding: EdgeInsets.all(8),
                          decoration: BoxDecoration(color: Color(0xFFFF6B6B), borderRadius: BorderRadius.circular(8)),
                          child: Icon(Icons.favorite, color: Colors.white),
                        ),
                        SizedBox(width: 12),
                        Text(
                          '카드뉴스 생성기',
                          style: GoogleFonts.notoSansKr(fontSize: 20, fontWeight: FontWeight.w900),
                        ),
                        Spacer(),
                         Container(
                          padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(20)),
                          child: Text('PRO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade600)),
                        ),
                      ],
                    ),
                  ),
                  
                  // Usage Guide (Only show if no data loaded)
                  if (_cardData == null) ...[
                     _buildGuideSection(),
                     Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20.0),
                      child: Column(
                        children: [
                           Text('주제만 입력하면', style: GoogleFonts.notoSansKr(fontSize: 24, fontWeight: FontWeight.w900, height: 1.2)),
                           Row(
                             mainAxisAlignment: MainAxisAlignment.center,
                             children: [
                               Text('원고와 디자인이 ', style: GoogleFonts.notoSansKr(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFFFF6B6B))),
                               Text('뚝딱!', style: GoogleFonts.notoSansKr(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.black)),
                             ],
                           ),
                        ],
                      ),
                    ),
                  ],

                  if (_cardData == null) _buildInputSection(),
                  if (_cardData != null) _buildPreviewSection(),
                ],
              ),
            ),
          ),
          // TOOLBAR (Visible when editing) - Sits mainly above keyboard due to Column + resizeToAvoidBottomInset
          if (_activeController != null)
             Container(
                color: Colors.white,
                // No padding needed for viewInsets if resizeToAvoidBottomInset is true (default)
                // But sometimes we need it if we want it strictly above.
                // With Column + Expanded, the toolbar will be at the bottom of the screen.
                // When keyboard opens, the scaffold resizes, pushing the bottom up. 
                // So the toolbar stays on top of the keyboard.
                child: ValueListenableBuilder(
                  valueListenable: _activeController!,
                  builder: (context, value, child) {
                    return RichTextToolbar(
                      style: _activeController == _headerController 
                          ? (_cardData!.slides[_currentPageIndex].headerStyle ?? CustomTextStyle(align: 'left', fontSize: 'text-3xl', color: '#000000'))
                          : (_cardData!.slides[_currentPageIndex].bodyStyle ?? CustomTextStyle(align: 'left', fontSize: 'text-base', color: '#000000')),
                      onUpdate: (newStyle) {
                        setState(() {
                          if (_activeController == _headerController) {
                             _cardData!.slides[_currentPageIndex].headerStyle = newStyle;
                          } else if (_activeController == _bodyController) {
                             _cardData!.slides[_currentPageIndex].bodyStyle = newStyle;
                          }
                        });
                      },
                      controller: _activeController!,
                    );
                  }
                ),
            ),
            
          // Offstage Export View removed (moved to top of stack)
            
            ],
          ),
        ],
      ),
    );
  }

  void _addManualSlide() {
    setState(() {
      _manualInputs.add({
        'header': TextEditingController(),
        'body': TextEditingController(),
      });
    });
  }

  void _removeManualSlide(int index) {
    if (_manualInputs.length <= 1) return; // Keep at least one slide
    setState(() {
      _manualInputs[index]['header']?.dispose();
      _manualInputs[index]['body']?.dispose();
      _manualInputs.removeAt(index);
    });
  }

  void _generateFromManualInput() {
    setState(() => _isLoading = true);

    // Simulate short delay for "generating" feel
    Future.delayed(Duration(milliseconds: 500), () {
      if (!mounted) return;
      
      List<Slide> slides = [];
      for (int i = 0; i < _manualInputs.length; i++) {
        bool isCover = i == 0;
        slides.add(Slide(
          pageNumber: i + 1,
          header: _manualInputs[i]['header']!.text,
          body: _manualInputs[i]['body']!.text,
          headerStyle: CustomTextStyle(
            align: isCover ? 'center' : 'left',
            fontSize: isCover ? 'text-4xl' : 'text-3xl',
            color: '#000000',
          ),
          bodyStyle: CustomTextStyle(
            align: 'left',
            fontSize: 'text-2xl',
            color: '#000000',
          ),
        ));
      }

      final data = CardNewsData(
        topic: _manualInputs.first['header']!.text, // Use cover title as topic
        targetAudience: '전체',
        tone: '기본',
        hashtags: [],
        slides: slides,
        themeIndex: 0,
      );

      setState(() {
        _cardData = data;
        _currentThemeIndex = 0;
        _slideKeys = List.generate(data.slides.length, (_) => GlobalKey());
        _exportSlideKeys = List.generate(data.slides.length, (_) => GlobalKey());
        _isLoading = false;
      });
    });
  }

  Widget _buildInputSection() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Signature Input
          TextField(
            controller: _signatureController,
            decoration: InputDecoration(
              labelText: '서명 (선택사항)',
              hintText: '카드뉴스 우측 하단에 들어갈 서명을 입력하세요 (예: @my_instagram)',
              prefixIcon: Icon(Icons.edit_note, color: Colors.grey),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
          SizedBox(height: 16),

          // Mode Toggle
          Container(
            padding: EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _inputMode = InputMode.json),
                    child: Container(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _inputMode == InputMode.json ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: _inputMode == InputMode.json ? [BoxShadow(color: Colors.black12, blurRadius: 4)] : [],
                      ),
                      alignment: Alignment.center,
                      child: Text("AI 결과 붙여넣기 (JSON)", style: TextStyle(fontWeight: FontWeight.bold, color: _inputMode == InputMode.json ? Colors.blue[900] : Colors.grey[600])),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _inputMode = InputMode.manual),
                    child: Container(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _inputMode == InputMode.manual ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: _inputMode == InputMode.manual ? [BoxShadow(color: Colors.black12, blurRadius: 4)] : [],
                      ),
                      alignment: Alignment.center,
                      child: Text("직접 입력하기", style: TextStyle(fontWeight: FontWeight.bold, color: _inputMode == InputMode.manual ? Colors.blue[900] : Colors.grey[600])),
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: 24),

          if (_inputMode == InputMode.json)
            _buildJsonInputForm()
          else
            _buildManualInputForm(),
        ],
      ),
    );
  }

  Widget _buildJsonInputForm() {
    return Container(
      padding: EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("AI 결과 붙여넣기", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[700])),
              Row(
                children: [
                  TextButton.icon(
                    onPressed: _pasteFromClipboard,
                    icon: Icon(Icons.paste, size: 16),
                    label: Text("붙여넣기"),
                  ),
                  TextButton.icon(
                    onPressed: _loadSample,
                    icon: Icon(Icons.auto_awesome, size: 16),
                    label: Text("예시"),
                  ),
                ],
              )
            ],
          ),
          SizedBox(height: 12),
          TextField(
            controller: _inputController,
            maxLines: 10,
            decoration: InputDecoration(
              hintText: "AI가 생성한 JSON 코드를 여기에 붙여넣으세요...",
              filled: true,
              fillColor: Colors.grey[50],
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            ),
          ),
          SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton.icon(
                onPressed: _isLoading ? null : () => _checkLimitAndGenerate(_parseJson),
              icon: _isLoading ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Icon(Icons.play_arrow),
              label: Text(_isLoading ? "변환 중..." : "카드뉴스 변환하기", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue[600],
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildManualInputForm() {
    return Column(
      children: [
        ...List.generate(_manualInputs.length, (index) {
          final isCover = index == 0;
          return Container(
            margin: EdgeInsets.only(bottom: 16),
            padding: EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.grey[200]!),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: Offset(0, 2))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isCover ? Colors.orange[100] : Colors.blue[50],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isCover ? "표지 (Page 1)" : "Page ${index + 1}",
                        style: TextStyle(
                          color: isCover ? Colors.orange[900] : Colors.blue[900],
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    Spacer(),
                    if (!isCover)
                      IconButton(
                        icon: Icon(Icons.delete_outline, color: Colors.grey[400]),
                        onPressed: () => _removeManualSlide(index),
                        padding: EdgeInsets.zero,
                        constraints: BoxConstraints(),
                      ),
                  ],
                ),
                SizedBox(height: 16),
                TextField(
                  controller: _manualInputs[index]['header'],
                  decoration: InputDecoration(
                    labelText: "제목 (Header)",
                    hintText: isCover ? "시선을 사로잡는 제목" : "핵심 소제목",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey[50],
                    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
                SizedBox(height: 12),
                if (!isCover) ...[
                  TextField(
                    controller: _manualInputs[index]['body'],
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: "본문 (Body)",
                      hintText: "설명할 내용을 짧게 입력하세요 (최대 2줄 권장)",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: Colors.grey[50],
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ]
              ],
            ),
          );
        }),
        
        SizedBox(height: 12),
        
        // Add Page Button
        OutlinedButton.icon(
          onPressed: _addManualSlide,
          icon: Icon(Icons.add),
          label: Text("페이지 추가하기"),
          style: OutlinedButton.styleFrom(
            padding: EdgeInsets.symmetric(vertical: 16),
            backgroundColor: Colors.white,
            foregroundColor: Colors.blue[800],
            side: BorderSide(color: Colors.blue[200]!),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),

        SizedBox(height: 32),
        
        // Generate Button
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton.icon(
            onPressed: _isLoading ? null : () => _checkLimitAndGenerate(_generateFromManualInput),
            icon: _isLoading ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Icon(Icons.check_circle_outline),
            label: Text(_isLoading ? "생성 중..." : "카드뉴스 바로 생성하기", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black87,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 4,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPreviewSection() {
    return Column(
      children: [
        SizedBox(height: 32),
        // Theme Selector
        SizedBox(
          height: 80,
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(horizontal: 24),
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Random Button
                Padding(
                  padding: const EdgeInsets.only(right: 12.0),
                  child: GestureDetector(
                     onTap: () {
                       setState(() {
                         _generatedTheme = generateRandomTheme();
                         _currentThemeIndex = -1; // -1 indicates custom random theme
                       });
                     },
                     child: Column(
                       mainAxisSize: MainAxisSize.min,
                       children: [
                         Container(
                           width: 60,
                           height: 60,
                           decoration: BoxDecoration(
                             shape: BoxShape.circle,
                             gradient: LinearGradient(colors: [Color(0xFF6366F1), Color(0xFFEC4899)]),
                             boxShadow: [BoxShadow(color: Colors.purple.withOpacity(0.3), blurRadius: 8, offset: Offset(0, 4))],
                           ),
                           child: Icon(Icons.shuffle, color: Colors.white, size: 28),
                         ),
                         SizedBox(height: 4),
                         Text("랜덤 생성", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey[600])),
                       ],
                     ),
                  ),
                ),
                // Existing Themes
                ...List.generate(appThemes.length, (index) {
                  final theme = appThemes[index];
                  final isSelected = _currentThemeIndex == index && _generatedTheme == null;
                  return GestureDetector(
                    onTap: () => setState(() {
                        _currentThemeIndex = index;
                        _generatedTheme = null; // Reset random theme
                    }),

                    child: Container(
                      width: 60,
                      height: 60,
                      margin: EdgeInsets.only(right: 12),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: isSelected ? Colors.blue : Colors.grey[200]!, width: isSelected ? 3 : 1),
                        color: Colors.white,
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)],
                      ),
                      child: Container(
                        margin: EdgeInsets.all(3),
                        decoration: theme.background.copyWith(shape: BoxShape.circle),
                        child: isSelected ? Icon(Icons.check, color: theme.textColor, size: 24) : null,
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
        SizedBox(height: 24),
        // Card Preview PageView
        SizedBox(
          height: 500, // Fixed height for preview
          child: PageView.builder(
            controller: _pageController,
            itemCount: _cardData!.slides.length,
            onPageChanged: _handlePageChange,
            itemBuilder: (context, index) {
              // We only map keys to the instantiated widgets. 
              // Only pass controllers if this is the ACTIVE page (simplify logic)
              final isCurrent = _pageController.positions.isNotEmpty 
                  ? (_pageController.page?.round() == index) 
                  : (index == 0); 
              
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8.0),
                child: Center(
                   // Wrap with ScrollbarTheme to explicitly color the scrollbar
                   child: ScrollbarTheme(
                     data: ScrollbarThemeData(
                       thumbColor: MaterialStateProperty.all(Colors.grey[600]),
                       trackColor: MaterialStateProperty.all(Colors.grey[300]),
                       thumbVisibility: MaterialStateProperty.all(true),
                       radius: const Radius.circular(10),
                       thickness: MaterialStateProperty.all(6),
                     ),
                     child: Scrollbar(
                       thumbVisibility: true,
                       child: SingleChildScrollView(
                         child: Column(
                           mainAxisSize: MainAxisSize.min,
                           children: [
                             CardPreview(
                               captureKey: _slideKeys[index],
                               slide: _cardData!.slides[index],
                               theme: _generatedTheme ?? appThemes[_currentThemeIndex],
                               isCover: index == 0,
                               // Pass controllers ONLY for the current page to avoid conflicts or heavy resource usage?
                               // Actually safer to recreate them in _onPageChanged.
                               // Here we assume _headerController matches the *current* page index from state.
                               // But PageView builds multiple items.
                               // The `_headerController` in state assumes "ACTIVE" page.
                               // So strictly, only the active page is editable. Others are just preview.
                               headerController: isCurrent ? _headerController : null,
                               bodyController: isCurrent ? _bodyController : null,
                               headerFocus: isCurrent ? _headerFocus : null,
                               bodyFocus: isCurrent ? _bodyFocus : null,
                               signature: _signatureController.text,
                             ),
                             SizedBox(height: 16),
                             // Actions Row
                             Row(
                               mainAxisAlignment: MainAxisAlignment.center,
                               children: [
                                 ElevatedButton.icon(
                                   onPressed: () => _saveToGallery(index),
                                   icon: Icon(Icons.download, size: 16),
                                   label: Text('이미지 저장'),
                                   style: ElevatedButton.styleFrom(
                                     backgroundColor: Colors.white,
                                     foregroundColor: Colors.grey[800],
                                     elevation: 0,
                                     side: BorderSide(color: Colors.grey[300]!),
                                   ),
                                 ),
                               ],
                             )
                           ],
                         ),
                       ),
                     ),
                   ),
                ),
              );
            },
          ),
        ),
        


        SizedBox(height: 20),
        
        // Save All Button
        Container(
          padding: EdgeInsets.symmetric(horizontal: 24),
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _saveAllToGallery,
             icon: Icon(Icons.save_alt),
             label: Text("모든 슬라이드 저장 (갤러리)"),
             style: ElevatedButton.styleFrom(
               backgroundColor: Colors.black87,
               foregroundColor: Colors.white,
               padding: EdgeInsets.symmetric(vertical: 16),
               shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
             ),
          ),
        ),
        
        SizedBox(height: 48),
      ],
    );
  }




}
