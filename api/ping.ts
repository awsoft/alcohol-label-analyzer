export default function handler(_req: any, res: any) {
  res.status(200).json({ probe: 'ts-no-imports', node: process.version });
}
