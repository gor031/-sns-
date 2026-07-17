import React from 'react';
import { ArrowLeft, Hammer } from 'lucide-react';

type LegalKind = 'terms' | 'privacy';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-t border-gray-200 py-6 first:border-t-0 first:pt-0">
    <h2 className="text-base font-black text-gray-900">{title}</h2>
    <div className="mt-3 space-y-2 text-sm font-medium leading-7 text-gray-700">{children}</div>
  </section>
);

export function LegalPage({ kind, onBack }: { kind: LegalKind; onBack: () => void }) {
  const isPrivacy = kind === 'privacy';
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={onBack} className="tool-icon-button" aria-label="이전 화면으로 돌아가기"><ArrowLeft size={21} /></button>
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-white"><Hammer size={19} /></span>
          <h1 className="text-lg font-black text-gray-900">{isPrivacy ? '개인정보처리방침' : '이용약관'}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-9 sm:px-6 sm:py-12">
        <p className="mb-8 text-sm font-medium text-gray-500">시행일: 2026년 7월 18일</p>
        {isPrivacy ? <PrivacyPolicy /> : <TermsOfService />}
      </main>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <Section title="1. 개인정보의 처리 목적">
        <p>모두뚝딱은 회원 식별, 로그인 유지, API 오남용 방지, 서비스 제공, 문의 대응 및 보안 사고 대응을 위해 필요한 범위에서 개인정보를 처리합니다.</p>
      </Section>
      <Section title="2. 처리하는 개인정보 항목">
        <p>Google 로그인 시 Firebase 사용자 식별자(UID), 이메일 주소, 표시 이름, 프로필 사진, 로그인 제공자 및 최근 로그인 시각을 처리합니다.</p>
        <p>서비스 이용 중 IP 주소, 브라우저·기기 정보, 접속 기록, App Check 및 reCAPTCHA 위험 분석 정보가 자동으로 처리될 수 있습니다.</p>
        <p>이용자가 기능을 실행할 때 카드뉴스 주제·원고, 음성 합성 문장, 음성 인식용 파일, 이미지 검색어가 처리를 위해 서버와 외부 API로 전송됩니다. 민감정보나 제3자의 개인정보를 입력하지 마세요.</p>
      </Section>
      <Section title="3. 보유 및 이용 기간">
        <p>로그인 계정 정보는 회원이 계정을 삭제할 때까지 보유합니다. 계정 삭제 후에는 관계 법령상 보관 의무가 있는 경우를 제외하고 지체 없이 삭제합니다.</p>
        <p>모두뚝딱은 생성 원고와 업로드 파일을 별도 데이터베이스에 저장하지 않습니다. 다만 보안·장애 대응을 위한 접속 기록과 외부 처리업체의 기록은 각 업체의 정책 및 관계 법령에 따른 기간 동안 보관될 수 있습니다.</p>
      </Section>
      <Section title="4. 처리 위탁 및 국외 처리">
        <p>서비스 운영을 위해 Google Firebase·reCAPTCHA·Cloud Text-to-Speech·AdSense, Netlify, Cerebras, Groq, Pexels, Pixabay 및 Freepik을 사용합니다. 로그인 정보, 접속 정보 또는 기능 실행에 필요한 입력 내용이 암호화된 통신으로 국외 서버에서 처리될 수 있습니다.</p>
        <p>각 업체는 인증, 보안 검증, 웹 호스팅, AI 원고 생성, 음성 인식·합성, 이미지 검색 및 광고 제공 목적 범위에서 정보를 처리하며, 보유 기간은 각 업체의 개인정보 보호정책과 계약 조건을 따릅니다.</p>
      </Section>
      <Section title="5. 이용자의 권리">
        <p>이용자는 화면 상단의 계정 메뉴에서 로그아웃하거나 계정을 삭제할 수 있습니다. 개인정보 열람·정정·삭제·처리정지 요청은 아래 문의처로 접수할 수 있습니다.</p>
      </Section>
      <Section title="6. 안전성 확보 조치">
        <p>전송구간 암호화(HTTPS), Firebase ID 토큰 및 App Check 검증, 서버 측 API 키 보관, 요청 횟수 제한과 최소 권한 원칙을 적용합니다.</p>
      </Section>
      <Section title="7. 쿠키와 광고">
        <p>Google AdSense와 Firebase는 로그인 유지, 보안 및 광고 제공을 위해 쿠키 또는 유사 기술을 사용할 수 있습니다. 브라우저 설정에서 쿠키를 제한할 수 있으나 일부 기능이 정상적으로 동작하지 않을 수 있습니다.</p>
      </Section>
      <Section title="8. 개인정보 보호 문의">
        <p>운영자 및 개인정보 보호 담당: 모두뚝딱 운영자</p>
        <p>이메일: <a className="font-bold underline" href="mailto:gog031@naver.com">gog031@naver.com</a></p>
      </Section>
    </>
  );
}

function TermsOfService() {
  return (
    <>
      <Section title="1. 목적과 적용">
        <p>본 약관은 모두뚝딱이 제공하는 카드뉴스, 음성 및 자막 제작 서비스의 이용 조건을 정합니다. 이용자가 Google 로그인을 완료하고 서비스를 사용하면 본 약관이 적용됩니다.</p>
      </Section>
      <Section title="2. 계정">
        <p>이용자는 본인이 관리하는 Google 계정으로 로그인해야 하며 계정의 안전한 관리에 책임이 있습니다. 계정 도용이나 비정상 이용이 확인되면 서비스 이용이 제한될 수 있습니다.</p>
      </Section>
      <Section title="3. 무료 서비스">
        <p>현재 웹 서비스는 무료로 제공됩니다. 운영상 또는 기술상 필요에 따라 기능, 제공량 또는 서비스 운영이 변경·중단될 수 있으며 중요한 변경은 서비스 화면을 통해 알립니다.</p>
      </Section>
      <Section title="4. 이용자 콘텐츠와 결과물">
        <p>이용자는 입력하거나 업로드하는 내용에 필요한 권리를 보유해야 합니다. 생성 결과물은 이용자가 사용할 수 있으나 AI 결과의 정확성, 완전성, 타인의 권리 침해 여부는 이용자가 검토해야 합니다.</p>
        <p>이미지 검색 결과와 폰트 등 제3자 자료에는 각 제공자의 라이선스가 적용되며 상업적 사용 전 이용자가 해당 조건을 확인해야 합니다.</p>
      </Section>
      <Section title="5. 금지 행위">
        <p>자동화된 대량 호출, 보안 기능 우회, 타인의 권리 침해, 불법 콘텐츠 제작, 서비스 장애 유발, API 또는 리소스의 무단 재판매 행위를 금지합니다.</p>
      </Section>
      <Section title="6. 책임 제한">
        <p>서비스는 현재 상태로 제공되며 외부 API, 네트워크, 브라우저 또는 기기 환경에 따라 일시적으로 사용할 수 없을 수 있습니다. 관련 법령이 허용하는 범위에서 무료 서비스의 중단이나 AI 결과 이용으로 발생한 간접 손해에 대한 책임은 제한됩니다.</p>
      </Section>
      <Section title="7. 약관 변경과 준거법">
        <p>약관이 변경되면 시행일과 변경 내용을 서비스에 게시합니다. 본 약관은 대한민국 법률을 따르며 분쟁은 관계 법령이 정한 관할법원에서 해결합니다.</p>
      </Section>
      <Section title="8. 문의">
        <p>서비스 관련 문의: <a className="font-bold underline" href="mailto:gog031@naver.com">gog031@naver.com</a></p>
      </Section>
    </>
  );
}
