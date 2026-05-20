const css = `
color: color-mix(in oklab, currentcolor 50%, transparent);
border-color: color-mix(in oklab, var(--color-black) 10%, transparent);
background-color: color-mix(in oklab, var(--color-slate-100) 50%, transparent);
`;

const replaced = css.replace(/color-mix\(in oklab,\s*(.*?)\s+\d+%?,\s*transparent\)/g, '$1');
console.log(replaced);
