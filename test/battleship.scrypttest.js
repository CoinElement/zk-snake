const { expect } = require('chai');


const { buildContractClass, bsv, PubKeyHash, toHex, Int, getPreimage, PubKey, signTx } = require('scryptlib');

const { loadDesc, newTx, inputSatoshis } = require('../helper');
const { zokratesProof, hashPoison } = require('../verifier.js');
const { privateKey } = require("../privateKey");

const Signature = bsv.crypto.Signature
// const privateKeyPlayer = new bsv.PrivateKey.fromRandom('testnet')
const privateKeyPlayer = privateKey
const publicKeyPlayer = bsv.PublicKey.fromPrivateKey(privateKeyPlayer)

console.log(privateKeyPlayer);
console.log(publicKeyPlayer);

const poisonState = 16;

describe('Test sCrypt contract BattleShip In Javascript', () => {
  let result
  let zksnake

  before(async () => {

    const ZkSnake = buildContractClass(loadDesc('zksnake'));

    const poisonHash = await hashPoison(poisonState);

    zksnake = new ZkSnake(new PubKey(toHex(publicKeyPlayer)),
      new Int(poisonHash), false, false, 0, 0);

    // const yourhash = await hashShips(playerShips);
    // const computerhash = await hashShips(computerShips);
    // battleShip = new BattleShip(new PubKey(toHex(publicKeyPlayer)),
    //   new PubKey(toHex(publicKeyComputer)),
    //   new Int(yourhash), new Int(computerhash), 0, 0, true)
  });

  async function testMove(contract, snakeState1, snakeState2, hit, newStates, poisonState) {
    console.log('generating proof ...')
    const { proof, output } = await zokratesProof(snakeState1, snakeState2, hit, poisonState); // external call

    console.log("Proof: ", proof);

    const tx = newTx();

    tx.addOutput(new bsv.Transaction.Output({
      script: contract.getNewStateScript(newStates),
      satoshis: inputSatoshis
    }))

    console.log("Stub1")

    const sig = signTx(tx, privateKeyPlayer, contract.lockingScript, inputSatoshis, 0, Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID)
    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, 0, Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID);

    // const sig = signTx(tx, privateKeyPlayer, contract.lockingScript, inputSatoshis)
    // const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis);
    console.log("Preimage", preimage.toJSONObject());
    const context = { tx, inputIndex: 0, inputSatoshis: inputSatoshis }

    const Proof = contract.getTypeClassByType("Proof");
    const G1Point = contract.getTypeClassByType("G1Point");
    const G2Point = contract.getTypeClassByType("G2Point");
    const FQ2 = contract.getTypeClassByType("FQ2");

    console.log('verify ...')
    // 调用合约
    const result = contract.move(sig, snakeState1, snakeState2, hit, new Proof({
      a: new G1Point({
        x: new Int(proof.proof.a[0]),
        y: new Int(proof.proof.a[1]),
      }),
      b: new G2Point({
        x: new FQ2({
          x: new Int(proof.proof.b[0][0]),
          y: new Int(proof.proof.b[0][1]),
        }),
        y: new FQ2({
          x: new Int(proof.proof.b[1][0]),
          y: new Int(proof.proof.b[1][1]),
        })
      }),
      c: new G1Point({
        x: new Int(proof.proof.c[0]),
        y: new Int(proof.proof.c[1]),
      })

    }), preimage).verify(context)

    console.log("Result", result);

    // contract.successfulYourHits = newStates.successfulYourHits;
    // contract.successfulComputerHits = newStates.successfulComputerHits;
    // contract.yourTurn = newStates.yourTurn;

    return result;
  }


  it('should success when poison at [4,0], poisonState is 16, player snake 1, player2 snake 0, hit=0', async () => {

    // result = await testMove(battleShip, playerShips, 1, 1, true, true, {
    //   successfulYourHits: 1,
    //   successfulComputerHits: 0,
    //   yourTurn: false
    // })

    // // eslint-disable-next-line no-unused-expressions
    // expect(result.success, result.error).to.be.true

    result = await testMove(zksnake, 1, 0, 0, {
      player1PoisonHit: false,
      player2PoisonHit: false,
      player1Snake: 1,
      player2Snake: 0
    }, 16)
    // eslint-disable-next-line no-unused-expressions
    expect(result.success, result.error).to.be.true
  });


  // it('should success when poison at [4,0], poisonState is 16, player1 snake 16, player2 snake 0, hit=1', async () => {

  //   // result = await testMove(battleShip, playerShips, 0, 0, false, false, {
  //   //   successfulYourHits: 1,
  //   //   successfulComputerHits: 0,
  //   //   yourTurn: true
  //   // })

  //   result = await testMove(zksnake, 1, 0, 1, {
  //     player1PoisonHit: true,
  //     player2PoisonHit: false,
  //     player1Snake: 16,
  //     player2Snake: 0
  //   }, 16)

  //   // eslint-disable-next-line no-unused-expressions
  //   expect(result.success, result.error).to.be.true

  // });


});
