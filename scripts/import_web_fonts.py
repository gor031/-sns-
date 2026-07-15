from __future__ import annotations

import argparse
import os
import json
import re
import shutil
import tempfile
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from fontTools.ttLib import TTFont


FONT_EXTENSIONS = {'.ttf', '.otf', '.woff', '.woff2'}
FORMAT_SCORE = {'.otf': 10, '.ttf': 20, '.woff': 30, '.woff2': 40}
GROUP_ORDER = ['기본', '고딕', '명조', 'Cafe24', '경기서체', '네이버 손글씨', '개성 글꼴']


@dataclass
class FontCandidate:
    path: Path
    source: str
    extension: str
    raw_family: str
    display_family: str
    family: str
    weight: int
    italic: bool
    variable: bool
    weight_min: int
    weight_max: int

    @property
    def score(self) -> int:
        score = FORMAT_SCORE[self.extension]
        if 'alternative' in self.source.lower():
            score -= 2
        return score


def decoded_name(record) -> str:
    try:
        return record.toUnicode().strip()
    except Exception:
        return ''


def font_names(font: TTFont, name_ids: tuple[int, ...]) -> list[str]:
    values: list[str] = []
    for record in font['name'].names:
        if record.nameID not in name_ids:
            continue
        value = decoded_name(record)
        if value and value not in values:
            values.append(value)
    return values


def first_korean(values: list[str]) -> str:
    return next((value for value in values if re.search(r'[가-힣]', value)), '')


def canonical_family(raw_family: str) -> str:
    family = raw_family.strip()
    if family.startswith('Pretendard'):
        return 'Pretendard'
    if family.startswith('Paperlogy '):
        return 'Paperlogy'
    if family.startswith('GyeonggiBatang'):
        return 'GyeonggiBatang'
    if family.startswith('GyeonggiTitleV'):
        return 'GyeonggiTitleV'
    if family.startswith('GyeonggiTitle'):
        return 'GyeonggiTitle'
    if family.startswith('Cafe24 Dongdong'):
        return 'Cafe24 Dongdong'
    if family.startswith('Cafe24 Ssurround'):
        return 'Cafe24 Ssurround'
    replacements = {
        'Cafe24 ClassicType OTF': 'Cafe24 ClassicType',
        'Cafe24 Danjunghae OTF': 'Cafe24 Danjunghae',
        'Cafe24 OnePrettyNight OTF': 'Cafe24 OnePrettyNight',
        'Cafe24 Shiningstar OTF': 'Cafe24 Shiningstar',
        'Cafe24 Syongsyong OTF': 'Cafe24 Syongsyong',
        'MaruBuriOTF': 'MaruBuri',
        'NanumMyeongjoOTF': 'NanumMyeongjo',
    }
    return replacements.get(family, family)


LABELS = {
    'Pretendard': '프리텐다드',
    'Paperlogy': '페이퍼로지',
    'Gmarket Sans TTF': 'G마켓 산스',
    'GyeonggiBatang': '경기천년바탕',
    'GyeonggiTitle': '경기천년제목',
    'GyeonggiTitleV': '경기천년제목 세로',
    'MaruBuri': '마루부리',
    'NanumMyeongjo': '나눔명조',
    'Chosun Centennial': '조선100년체',
    'MemomentKkukkukk': '꾸꾸꾸체',
    'Ownglyph GeungJeong Regular': '온글잎 긍정',
    'Griun Cherry 1 Spoon': '그리운 체리 한 스푼',
    'Cafe24 ClassicType': '카페24 클래식타입',
    'Cafe24 Danjunghae': '카페24 단정해',
    'Cafe24 Dongdong': '카페24 동동',
    'Cafe24 OnePrettyNight': '카페24 고운밤',
    'Cafe24 PRO Slim Max': '카페24 프로 슬림맥스',
    'Cafe24 Shiningstar': '카페24 빛나는별',
    'Cafe24 Ssurround': '카페24 써라운드',
    'Cafe24 Syongsyong': '카페24 숑숑',
}


def display_label(family: str, candidates: list[FontCandidate]) -> str:
    if family in LABELS:
        return LABELS[family]
    korean = next((candidate.display_family for candidate in candidates if re.search(r'[가-힣]', candidate.display_family)), '')
    return korean or family


def font_group(family: str, candidates: list[FontCandidate]) -> str:
    source = ' '.join(candidate.source for candidate in candidates).lower()
    if 'clova-all' in source or family.startswith('Nanum '):
        return '네이버 손글씨'
    if family.startswith('Cafe24'):
        return 'Cafe24'
    if family.startswith('Gyeonggi'):
        return '경기서체'
    if family in {'MaruBuri', 'NanumMyeongjo', 'Chosun Centennial'}:
        return '명조'
    if family in {'Pretendard', 'Paperlogy', 'Gmarket Sans TTF'}:
        return '고딕'
    return '개성 글꼴'


def inspect_font(data: bytes, source: str, extension: str, temp_dir: Path, index: int) -> FontCandidate:
    temp_path = temp_dir / f'{index:04d}{extension}'
    temp_path.write_bytes(data)
    font = TTFont(temp_path, lazy=True)
    try:
        families = font_names(font, (16, 1))
        raw_family = next((value for value in families if not re.search(r'[가-힣]', value)), families[0] if families else Path(source).stem)
        display_family = first_korean(families) or raw_family
        os2 = font.get('OS/2')
        weight = int(getattr(os2, 'usWeightClass', 400) or 400)
        italic = bool(getattr(os2, 'fsSelection', 0) & 1)
        variable = 'fvar' in font
        weight_min = weight
        weight_max = weight
        if variable:
            weight_axis = next((axis for axis in font['fvar'].axes if axis.axisTag == 'wght'), None)
            if weight_axis:
                weight_min = int(weight_axis.minValue)
                weight_max = int(weight_axis.maxValue)
        return FontCandidate(
            path=temp_path,
            source=source,
            extension=extension,
            raw_family=raw_family,
            display_family=display_family,
            family=canonical_family(raw_family),
            weight=weight,
            italic=italic,
            variable=variable,
            weight_min=weight_min,
            weight_max=weight_max,
        )
    finally:
        font.close()


def collect_fonts(source_dir: Path, temp_dir: Path) -> list[FontCandidate]:
    candidates: list[FontCandidate] = []
    counter = 0

    def add_font(data: bytes, source: str, extension: str) -> None:
        nonlocal counter
        counter += 1
        candidates.append(inspect_font(data, source, extension, temp_dir, counter))

    def scan_zip(data: bytes, source: str) -> None:
        try:
            with ZipFile(BytesIO(data)) as archive:
                for entry in archive.infolist():
                    if entry.is_dir() or '__MACOSX' in entry.filename or Path(entry.filename).name.startswith('._'):
                        continue
                    extension = Path(entry.filename).suffix.lower()
                    entry_source = f'{source}!{entry.filename}'
                    if extension in FONT_EXTENSIONS:
                        add_font(archive.read(entry), entry_source, extension)
                    elif extension == '.zip':
                        scan_zip(archive.read(entry), entry_source)
        except BadZipFile as error:
            raise RuntimeError(f'압축파일을 읽지 못했습니다: {source}') from error

    for path in sorted(source_dir.iterdir(), key=lambda item: item.name.lower()):
        extension = path.suffix.lower()
        if extension in FONT_EXTENSIONS:
            add_font(path.read_bytes(), path.name, extension)
        elif extension == '.zip':
            scan_zip(path.read_bytes(), path.name)
    return candidates


def selected_faces(candidates: list[FontCandidate]) -> dict[str, list[FontCandidate]]:
    grouped: dict[str, list[FontCandidate]] = {}
    for candidate in candidates:
        grouped.setdefault(candidate.family, []).append(candidate)

    selected: dict[str, list[FontCandidate]] = {}
    for family, family_candidates in grouped.items():
        variables = [candidate for candidate in family_candidates if candidate.variable]
        if variables:
            selected[family] = [max(variables, key=lambda candidate: candidate.score)]
            continue
        best_by_face: dict[tuple[int, bool], FontCandidate] = {}
        for candidate in family_candidates:
            key = (candidate.weight, candidate.italic)
            previous = best_by_face.get(key)
            if previous is None or candidate.score > previous.score:
                best_by_face[key] = candidate
        selected[family] = sorted(best_by_face.values(), key=lambda candidate: (candidate.italic, candidate.weight))
    return selected


def save_woff2(candidate: FontCandidate, output: Path) -> None:
    if candidate.extension == '.woff2':
        shutil.copyfile(candidate.path, output)
        return
    font = TTFont(candidate.path, recalcBBoxes=False, recalcTimestamp=False)
    try:
        font.flavor = 'woff2'
        font.save(output, reorderTables=False)
    finally:
        font.close()


def save_woff2_job(job: tuple[FontCandidate, Path]) -> None:
    save_woff2(*job)


def write_outputs(source_dir: Path, project_dir: Path) -> None:
    public_dir = project_dir / 'public' / 'fonts'
    public_dir.mkdir(parents=True, exist_ok=True)
    for old_file in public_dir.glob('mdd-*.woff2'):
        old_file.unlink()

    with tempfile.TemporaryDirectory(prefix='modu-fonts-') as temp_name:
        candidates = collect_fonts(source_dir, Path(temp_name))
        families = selected_faces(candidates)
        ordered = sorted(
            families.items(),
            key=lambda item: (
                GROUP_ORDER.index(font_group(item[0], item[1])),
                display_label(item[0], item[1]),
            ),
        )

        css_lines = ['/* Generated by scripts/import_web_fonts.py. */', '']
        options = [{
            'id': 'system',
            'label': '기본 고딕',
            'family': "'Noto Sans KR', sans-serif",
            'group': '기본',
        }]
        manifest = []
        conversion_jobs: list[tuple[FontCandidate, Path]] = []

        for family_index, (family, faces) in enumerate(ordered, start=1):
            alias = f'MDD_Font_{family_index:03d}'
            label = display_label(family, faces)
            group = font_group(family, faces)
            fallback = 'serif' if group == '명조' else 'sans-serif'
            options.append({
                'id': f'font-{family_index:03d}',
                'label': label,
                'family': f"'{alias}', {fallback}",
                'group': group,
            })
            manifest_faces = []
            for face_index, face in enumerate(faces, start=1):
                style = 'italic' if face.italic else 'normal'
                weight_value = f'{face.weight_min} {face.weight_max}' if face.variable else str(face.weight)
                filename = f'mdd-{family_index:03d}-{face_index:02d}.woff2'
                conversion_jobs.append((face, public_dir / filename))
                css_lines.extend([
                    '@font-face {',
                    f"  font-family: '{alias}';",
                    f"  src: url('/fonts/{filename}') format('woff2');",
                    f'  font-style: {style};',
                    f'  font-weight: {weight_value};',
                    '  font-display: swap;',
                    '}',
                    '',
                ])
                manifest_faces.append({
                    'file': filename,
                    'weight': weight_value,
                    'style': style,
                    'source': face.source,
                })
            manifest.append({
                'id': f'font-{family_index:03d}',
                'label': label,
                'family': family,
                'group': group,
                'faces': manifest_faces,
            })

        worker_count = min(8, max(2, os.cpu_count() or 2))
        with ProcessPoolExecutor(max_workers=worker_count) as executor:
            list(executor.map(save_woff2_job, conversion_jobs, chunksize=1))

        (project_dir / 'fontCatalog.css').write_text('\n'.join(css_lines), encoding='utf-8')
        catalog_source = (
            "export interface FontOption {\n"
            "  id: string;\n"
            "  label: string;\n"
            "  family: string;\n"
            "  group: string;\n"
            "}\n\n"
            f"export const FONT_OPTIONS: FontOption[] = {json.dumps(options, ensure_ascii=False, indent=2)};\n"
        )
        (project_dir / 'fontCatalog.ts').write_text(catalog_source, encoding='utf-8')
        (public_dir / 'manifest.json').write_text(
            json.dumps({'families': manifest}, ensure_ascii=False, indent=2),
            encoding='utf-8',
        )

        total_bytes = sum(path.stat().st_size for path in public_dir.glob('mdd-*.woff2'))
        print(json.dumps({
            'sourceRecords': len(candidates),
            'webFontFamilies': len(ordered),
            'woff2Files': sum(len(faces) for _, faces in ordered),
            'totalMB': round(total_bytes / 1024 / 1024, 2),
        }, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(description='Import desktop font archives as web-only WOFF2 assets.')
    parser.add_argument('source', type=Path, help='Directory containing font files and ZIP archives')
    parser.add_argument('--project', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    write_outputs(args.source.resolve(), args.project.resolve())


if __name__ == '__main__':
    main()
