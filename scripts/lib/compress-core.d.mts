export declare const COMPRESSIBLE: Set<string>;
export declare const MIN_BYTES: number;
export declare const MIN_SAVING: number;
export declare function shouldCompress(path: string, size: number): boolean;
export declare function sidecars(buf: Buffer): { ext: string; data: Buffer }[];
export declare function compressDir(dir: string): { files: number; before: number; after: number };
