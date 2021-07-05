import { ethers } from 'ethers';
import { Eip1193Bridge } from '@ethersproject/experimental';

export class Eip1193BridgeHelper extends Eip1193Bridge {
  constructor(signer: ethers.Signer, provider?: ethers.providers.Provider) {
    super(signer, provider);
  }

  /**
   * Cleans some parameters that "ethers lib" complains with if they are present
   * but not allowed.
   *
   * @param request - Request object with the ETH method to call and their params.
   * @returns The result value from the base class request method.
   */
  request(request: { method: string; params?: Array<any> }): Promise<any> {
    // Apply method renaming and filtering out of troubling parameters
    // coming from the web3 provider.
    switch (request.method) {
      case 'eth_call':
        // Remove "from" and "gas" fields, if present.
        this.deleteParams(['from', 'gas'], request.params);
        break;
      case 'eth_estimateGas':
        // Rename method.
        request.method = 'estimateGas';

        // Remove "from" and "gas" fields, if present.
        this.deleteParams(['from', 'gas'], request.params);
        break;
      case 'net_version':
        // Rename method.
        request.method = 'eth_chainId';

        // Remove "from" fields, if present.
        this.deleteParams(['from'], request.params);
        break;
      case 'eth_sendTransaction':
        // Remove "encodeAbi", "from" and "gas" fields, if present.
        this.deleteParams(['encodeAbi', 'from', 'gas'], request.params);
        break;
      default:
        break;
    }

    // Invoke parent's method now that the request object is clean.
    const result = super.request(request);
    return result;
  }

  private deleteParams(paramNames: Array<string>, params?: Array<any>) {
    if (!params || params.length == 0) {
      // Do nothing. Parameter list come empty.
      return;
    }

    for (const paramName of paramNames) {
      delete params[0][paramName];
    }
  }
}
