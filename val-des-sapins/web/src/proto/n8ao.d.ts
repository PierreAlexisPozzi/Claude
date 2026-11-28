// N8AO (CC0 / ISC) n'embarque pas de types : déclaration minimale utilisée par src/proto/proto.ts
declare module 'n8ao' {
  export class N8AOPass {
    constructor(scene: unknown, camera: unknown, width?: number, height?: number);
    configuration: Record<string, unknown>;
    setSize(width: number, height: number): void;
  }
}
