const bcrypt = require('bcryptjs');

async function test() {
  const hash = '$2a$12$tso';
  console.log('Testing password...');
  const r1 = await bcrypt.compare('SuperLink@2024!', hash);
  console.log('SuperLink@2024! valid:', r1);
  const r2 = await bcrypt.compare('admin123', hash);
  console.log('admin123 valid:', r2);
  const r3 = await bcrypt.compare('admin@2024', hash);
  console.log('admin@2024 valid:', r3);
  const r4 = await bcrypt.compare('SuperLink@2024', hash);
  console.log('SuperLink@2024 valid:', r4);
  const r5 = await bcrypt.compare('superlink', hash);
  console.log('superlink valid:', r5);
  const r6 = await bcrypt.compare('Superlink@2024', hash);
  console.log('Superlink@2024 valid:', r6);
}

test();