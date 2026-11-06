import bcrypt from 'bcrypt';

// Ishlatish: npm run hash -- Parol123
const password = process.argv[2] || 'Parol123';
bcrypt.hash(password, 10).then((hash) => {
  console.log(hash);
});
