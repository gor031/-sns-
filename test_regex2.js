const css = `
--tw-shadow-color: color-mix(in oklab, var(--color-indigo-600) var(--tw-shadow-alpha), transparent);
--tw-gradient-position: to bottom in oklab;
background-color: color-mix(in oklab, var(--color-primary) 5%, transparent);
color: color-mix(in oklab, currentcolor 50%, transparent);
`;

let replaced = css;

// Replace color-mix
replaced = replaced.replace(
  /color-mix\(\s*in\s+oklab\s*,\s*([^ ]+(?:\([^)]*\))?)[^,]*,\s*transparent\s*\)/g,
  '$1'
);

// Replace remaining " in oklab"
replaced = replaced.replace(/\s+in\s+oklab/g, '');

console.log(replaced);
