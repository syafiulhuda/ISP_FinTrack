const inactiveat = new Date("2026-05-01T19:31:11.356Z");
console.log("toISOString:", inactiveat.toISOString().slice(0, 7));
console.log("getFullYear:", `${inactiveat.getFullYear()}-${String(inactiveat.getMonth() + 1).padStart(2, '0')}`);
