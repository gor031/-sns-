const css = `
--tw-shadow-color: color-mix(in oklab, var(--color-indigo-600) var(--tw-shadow-alpha), transparent);
`;

const regex = /color-mix\(\s*in\s+oklab\s*,\s*(var\([^)]+\)|[a-zA-Z]+|#[0-9a-fA-F]+)[\s\S]*?,\s*transparent\s*\)/g;

console.log(css.replace(regex, '$1'));
