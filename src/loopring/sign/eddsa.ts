// Taken and modified from
// https://github.com/iden3/circomlib
import { KeyPair, Signature } from './types';
import { sha512 } from 'js-sha512';

const createBlakeHash = require('blake-hash');
const bigInt = require('snarkjs').bigInt;
const babyJub = require('./babyjub');
const poseidon = require('./poseidon');

export class EdDSA {
  public static generateKeyPair(seed: string, base: number = 10) {
    const secretKey = bigInt
      .leBuff2int(Buffer.from(seed))
      .mod(babyJub.subOrder);
    const publicKey = babyJub.mulPointEscalar(babyJub.Base8, secretKey);
    const keyPair: KeyPair = {
      publicKeyX: publicKey[0].toString(base),
      publicKeyY: publicKey[1].toString(base),
      secretKey: secretKey.toString(base),
    };
    return keyPair;
  }

  public static sign0(strKey: string, message: string) {
    const key = bigInt(strKey);
    const msg = bigInt(message);

    // r = H(K, M) mod L
    // H: SHA512 function
    // K: key byte buffer (little endian)
    // M: message byte buffer (little endian)
    // L: JUBJUB_L (subOrder)
    const K = bigInt.leInt2Buff(key, 32);
    const M = bigInt.leInt2Buff(msg, 32);
    const L = babyJub.subOrder;
    const KM = Buffer.concat([K, M]);
    const H = sha512.digest(KM);
    const r = bigInt.leBuff2int(Buffer.from(H)).mod(L);

    // const h1 = createBlakeHash('blake512').update(msg).digest();
    // const msgBuff = bigInt.leInt2Buff(bigInt(msg), 32);
    // const rBuff = createBlakeHash('blake512')
    //   .update(Buffer.concat([h1.slice(32, 64), msgBuff]))
    //   .digest();
    // let r = bigInt.leBuff2int(rBuff);
    // r = r.mod(babyJub.subOrder);

    const A = babyJub.mulPointEscalar(babyJub.Base8, key);
    const R8 = babyJub.mulPointEscalar(babyJub.Base8, r); // R = rB

    const hasher = poseidon.createHash(6, 6, 52);
    const hm = hasher([R8[0], R8[1], A[0], A[1], msg]);
    const S = r.add(hm.mul(key)).mod(babyJub.subOrder);

    const signature: Signature = {
      Rx: R8[0].toString(),
      Ry: R8[1].toString(),
      s: S.toString(),
    };
    return signature;
  }

  public static sign(strKey: string, msg: string) {
    const key = bigInt(strKey);
    const prv = bigInt.leInt2Buff(key, 32);

    const h1 = createBlakeHash('blake512').update(prv).digest();
    const msgBuff = bigInt.leInt2Buff(bigInt(msg), 32);
    const rBuff = createBlakeHash('blake512')
      .update(Buffer.concat([h1.slice(32, 64), msgBuff]))
      .digest();
    let r = bigInt.leBuff2int(rBuff);
    r = r.mod(babyJub.subOrder);

    const A = babyJub.mulPointEscalar(babyJub.Base8, key);
    const R8 = babyJub.mulPointEscalar(babyJub.Base8, r);

    const hasher = poseidon.createHash(6, 6, 52);
    const hm = hasher([R8[0], R8[1], A[0], A[1], msg]);
    const S = r.add(hm.mul(key)).mod(babyJub.subOrder);

    const signature: Signature = {
      Rx: R8[0].toString(),
      Ry: R8[1].toString(),
      s: S.toString(),
    };
    return signature;
  }

  public static verify(msg: string, sig: Signature, pubKey: string[]) {
    const A = [bigInt(pubKey[0]), bigInt(pubKey[1])];
    const R = [bigInt(sig.Rx), bigInt(sig.Ry)];
    const S = bigInt(sig.s);

    // Check parameters
    if (!babyJub.inCurve(R)) return false;
    if (!babyJub.inCurve(A)) return false;
    if (S >= babyJub.subOrder) return false;

    const hasher = poseidon.createHash(6, 6, 52);
    const hm = hasher([R[0], R[1], A[0], A[1], bigInt(msg)]);

    const Pleft = babyJub.mulPointEscalar(babyJub.Base8, S);
    let Pright = babyJub.mulPointEscalar(A, hm);
    Pright = babyJub.addPoint(R, Pright);

    if (!Pleft[0].equals(Pright[0])) return false;
    if (!Pleft[1].equals(Pright[1])) return false;

    return true;
  }
}
