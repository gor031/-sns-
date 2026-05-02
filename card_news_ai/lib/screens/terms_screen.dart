import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text('약관 및 정책', style: GoogleFonts.notoSansKr(fontWeight: FontWeight.bold)),
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 1,
          bottom: TabBar(
            labelColor: Colors.black,
            indicatorColor: Colors.black,
            tabs: [
              Tab(text: '이용약관'),
              Tab(text: '개인정보처리방침'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildMarkdownLikeText(_termsOfService),
            _buildMarkdownLikeText(_privacyPolicy),
          ],
        ),
      ),
    );
  }

  Widget _buildMarkdownLikeText(String text) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(20),
      child: Text(
        text,
        style: GoogleFonts.notoSansKr(fontSize: 14, height: 1.6, color: Colors.grey[800]),
      ),
    );
  }

  static const String _termsOfService = '''
제1조 (목적)
본 약관은 '카드뚝딱'(이하 "서비스")이 제공하는 카드뉴스 제작 서비스의 이용과 관련하여 개발자와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (서비스의 제공)
1. 본 서비스는 사용자가 입력한 텍스트를 기반으로 카드뉴스를 생성하고 이미지를 저장하는 기능을 제공합니다.
2. 서비스는 별도의 회원가입 없이 이용 가능하며, 생성된 결과물은 사용자의 기기에만 저장됩니다.

제3조 (저작권의 귀속 및 이용)
1. 서비스 내에서 제공되는 템플릿, 디자인 요소, 폰트 등의 지식재산권은 개발자 또는 원권리자에게 귀속됩니다.
2. 사용자가 서비스를 통해 생성한 카드뉴스 결과물의 저작권은 사용자에게 귀속됩니다.
3. 사용자는 생성된 결과물을 영리적, 비영리적 목적으로 자유롭게 사용할 수 있습니다. 단, 서비스의 소스코드나 리소스를 역분석하거나 추출하여 재배포하는 행위는 금지됩니다.

제4조 (책임의 제한)
1. 개발자는 무료로 제공되는 서비스 이용과 관련하여 관련법에 특별한 규정이 없는 한 책임을 지지 않습니다.
2. 개발자는 천재지변, 기기 오류, 또는 기타 불가항력적인 사유로 인해 서비스를 제공할 수 없는 경우에 대한 책임이 면제됩니다.
3. 사용자가 생성한 콘텐츠의 내용이 제3자의 권리를 침해하여 발생하는 모든 법적 책임은 사용자 본인에게 있습니다.

제5조 (서비스의 변경 및 중단)
개발자는 운영상, 기술상의 필요에 따라 서비스의 전부 또는 일부를 수정하거나 중단할 수 있습니다.
''';

  static const String _privacyPolicy = '''
< 카드뚝딱 개인정보처리방침 >

'카드뚝딱'은(는) 이용자의 개인정보를 중요시하며, "개인정보 보호법"을 준수하고 있습니다.

1. 개인정보의 수집 및 이용 목적
본 앱은 별도의 회원가입 절차가 없으며, 사용자의 이름, 전화번호, 이메일 등의 개인정보를 서버로 전송하거나 저장하지 않습니다. 모든 카드뉴스 제작 데이터는 사용자의 기기 내에만 저장됩니다.

2. 수집하는 개인정보의 항목
본 앱은 직접적인 개인정보를 수집하지 않습니다. 단, 서비스 이용 과정에서 광고 서비스(Google AdMob)에 의해 다음과 같은 정보가 자동으로 생성되어 수집될 수 있습니다.
- 수집 항목: 광고 식별자(Advertising ID), 기기 정보, 앱 이용 기록
- 이용 목적: 맞춤형 광고 제공 및 광고 성과 분석

3. 개인정보의 제3자 제공 (Google AdMob)
본 앱은 수익 창출을 위해 Google AdMob SDK를 사용하고 있습니다. 구글은 광고 제공을 위해 사용자의 기기 정보를 활용할 수 있으며, 이에 대한 자세한 내용은 구글의 개인정보처리방침을 따릅니다.
- Google 개인정보처리방침: https://policies.google.com/privacy

4. 권한 사용 안내
본 앱은 서비스 제공을 위해 다음과 같은 기기 권한을 최소한으로 사용합니다.
- 저장소(갤러리) 접근 권한: 생성된 카드뉴스 이미지를 기기에 저장하기 위해 필요합니다. (Android 13 이상은 미디어 권한)

5. 문의처
서비스 이용 및 개인정보 관련 문의사항은 스토어 페이지의 개발자 이메일을 통해 문의해 주시기 바랍니다.

공고일자: 2026년 1월 26일
시행일자: 2026년 1월 26일
''';
}
