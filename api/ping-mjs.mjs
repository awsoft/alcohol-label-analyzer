export default function handler(_req, res) {
  res.status(200).json({ probe: 'mjs-no-imports', node: process.version });
}
