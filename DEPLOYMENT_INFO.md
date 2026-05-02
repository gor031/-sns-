# 프로젝트 배포 및 저장소 정보 (필독)

현재 `E:\cardnews` 폴더의 디자인 스튜디오 최신 버전은 두 개의 서로 다른 Netlify 사이트에 배포되며, 각각 바라보는 GitHub 원격 저장소(remote)가 다릅니다. 이 내용을 항상 기억하여 배포 시 두 곳 모두 적용되도록 해야 합니다.

## 1. 메인 배포 (rnrmk 도메인)
- **실제 서비스 URL**: `https://card.rnrmk.xyz/`
- **GitHub 저장소**: `https://github.com/gor031/snscardnews.git`
- **Git 원격 이름(remote)**: `origin-rnrmk`
- **배포 방법**: 
  ```bash
  git push origin-rnrmk main:master --force
  git push origin-rnrmk main:main --force
  ```

## 2. 서브 배포 (gaforo 도메인)
- **실제 서비스 URL**: `https://sns-cardnews.gaforo.co.kr/`
- **GitHub 저장소**: `https://github.com/gor031/-sns-.git`
- **Git 원격 이름(remote)**: `origin`
- **배포 방법**:
  ```bash
  git push origin main
  ```

## ⚠️ 중요 주의사항 (Netlify 빌드)
Netlify 환경에서 React/Vite 기반 앱을 정상적으로 빌드하려면 최신 Node.js 환경(버전 20)이 필수입니다. 이를 위해 프로젝트 루트 경로에 `netlify.toml` 파일이 존재해야 합니다.
```toml
# netlify.toml 설정 내용
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
```
코드를 갱신한 후에는 위 저장소 두 곳에 모두 푸시를 날려주어야 두 도메인 모두 최신화됩니다.
