import { Type } from '@google/genai';

export default function handler(_req: any, res: any) {
  res.status(200).json({ probe: 'ts-genai-import', hasType: !!Type });
}
