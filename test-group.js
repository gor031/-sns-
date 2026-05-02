const fabric = require('E:/cardnews/node_modules/fabric');

const canvas = new fabric.Canvas(null, { width: 800, height: 600 });
const rect1 = new fabric.Rect({ left: 100, top: 100, width: 50, height: 50, fill: 'red' });
const rect2 = new fabric.Rect({ left: 200, top: 200, width: 50, height: 50, fill: 'blue' });

canvas.add(rect1, rect2);

const sel = new fabric.ActiveSelection([rect1, rect2], { canvas });
canvas.setActiveObject(sel);

console.log("Selection coords:", sel.left, sel.top);

const items = sel.removeAll();
console.log("Items count after removeAll:", items.length);

const group = new fabric.Group(items);
canvas.add(group);
canvas.setActiveObject(group);

console.log("Group coords:", group.left, group.top);
