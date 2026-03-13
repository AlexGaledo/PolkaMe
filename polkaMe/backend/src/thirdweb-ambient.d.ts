/**
 * Ambient type declaration for `thirdweb` main entry.
 *
 * thirdweb v5 ships its type declarations only for ESM consumers (`exports.types`)
 * but the root-level `thirdweb.d.ts` file is missing from the package, causing
 * `moduleResolution: "node"` to fail.  This file provides the minimal types our
 * backend actually uses so `tsc --noEmit` passes without touching node_modules.
 */
declare module "thirdweb" {
    /** Opaque handle returned by createThirdwebClient. */
    export interface ThirdwebClient {
        readonly secretKey?: string;
        readonly clientId?: string;
    }

    export interface CreateThirdwebClientOptions {
        /** Server-side secret key (backend only — never expose to clients). */
        secretKey?: string;
        /** Public client ID (frontend safe). */
        clientId?: string;
    }

    /**
     * Create a thirdweb client instance.
     * Use `secretKey` on the server and `clientId` in the browser.
     */
    export function createThirdwebClient(options: CreateThirdwebClientOptions): ThirdwebClient;
}
