const fs = require('fs');
if (fs.existsSync('apps/web/.dev-db.json')) {
  const data = JSON.parse(fs.readFileSync('apps/web/.dev-db.json'));
  let fixed = 0;
  if (data.nodes) {
    for (const n of data.nodes) {
      if (typeof n.label === 'object' && n.label.value) { n.label = n.label.value; fixed++; }
      if (typeof n.vendor === 'object' && n.vendor.value) { n.vendor = n.vendor.value; }
      if (typeof n.time === 'object' && n.time.value) { n.time = n.time.value; }
    }
  }
  fs.writeFileSync('apps/web/.dev-db.json', JSON.stringify(data, null, 2));
  console.log('Fixed', fixed, 'nodes in file.');
}
