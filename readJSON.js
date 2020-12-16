const fs = require('fs');

let sum = 0;
let error = true;
let i = 0;
while (error) {
  try {
    const x = JSON.parse(fs.readFileSync(`./payload-${i}.json`).toString('utf8'));
    console.log(x.data.length);
    sum += x.data.length;
    // console.log(x);
  } catch (e) {
    // console.log(e);
    error = false;
  }
  i++;
}
console.log(sum);
