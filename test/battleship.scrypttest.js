const { expect } = require('chai');


const { buildContractClass, bsv, PubKeyHash, toHex, Int, getPreimage, PubKey, signTx } = require('scryptlib');

const { loadDesc, newTx, inputSatoshis } = require('../helper');
const { zokratesProof, hashPoison } = require('../verifier.js');
const { privateKey } = require("../privateKey");

const privateKeyPlayer = privateKey
const publicKeyPlayer = bsv.PublicKey.fromPrivateKey(privateKeyPlayer)

const poisonState = 17;

describe('Test sCrypt contract BattleShip In Javascript', () => {
  let result
  let zksnake

  before(async () => {

    const ZkSnake = buildContractClass(loadDesc('zksnake'));

    const poisonHash = await hashPoison(poisonState);

    zksnake = new ZkSnake(new PubKey(toHex(publicKeyPlayer)),
      new Int(poisonHash), false, false, 0, 0);
  });

  async function testMove(contract, snakeState1, snakeState2, hit, newStates, poisonState) {
    console.log('generating proof ...')
    const { proof, output } = await zokratesProof(snakeState1, snakeState2, hit, poisonState); // external call

    console.log("Proof: ", proof, "Output: ", output);

    const tx = newTx();

    tx.addOutput(new bsv.Transaction.Output({
      script: contract.getNewStateScript(newStates),
      satoshis: inputSatoshis
    }))

    const sig = signTx(tx, privateKeyPlayer, contract.lockingScript, inputSatoshis)
    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis);

    console.log("Preimage", preimage.toJSONObject());
    const context = { tx, inputIndex: 0, inputSatoshis: inputSatoshis }

    const Proof = contract.getTypeClassByType("Proof");
    const G1Point = contract.getTypeClassByType("G1Point");
    const G2Point = contract.getTypeClassByType("G2Point");
    const FQ2 = contract.getTypeClassByType("FQ2");

    console.log('Calling contract move and verify context ...')
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

    console.log("Result: ", result);

    contract.player1Snake = newStates.player1Snake;
    contract.player2Snake = newStates.player2Snake;
    contract.player1PoisonHit = newStates.player1PoisonHit;
    contract.player2PoisonHit = newStates.player2PoisonHit;

    return result;
  }


  it('should success when poison at [4,0] and [4,4], poisonState is 17, player snake 1, player2 snake 0, hit=0', async () => {
    result = await testMove(zksnake, 1, 0, 0, {
      player1PoisonHit: false,
      player2PoisonHit: false,
      player1Snake: 1,
      player2Snake: 0
    }, poisonState)
    // eslint-disable-next-line no-unused-expressions
    expect(result.success, result.error).to.be.true
  });


  it('should success when poison at [4,0] and [4,4], poisonState is 17, player1 snake 16, player2 snake 0, hit=1', async () => {
    result = await testMove(zksnake, 16, 0, 1, {
      player1PoisonHit: true,
      player2PoisonHit: false,
      player1Snake: 16,
      player2Snake: 0
    }, poisonState)

    // eslint-disable-next-line no-unused-expressions
    expect(result.success, result.error).to.be.true
  });

  it('should success when poison at [4,0] and [4,4], poisonState is 17, player1 snake 0, player2 snake 16, hit=2', async () => {
    result = await testMove(zksnake, 0, 16, 2, {
      player1PoisonHit: false,
      player2PoisonHit: true,
      player1Snake: 0,
      player2Snake: 16
    }, poisonState)

    // eslint-disable-next-line no-unused-expressions
    expect(result.success, result.error).to.be.true
  });

  it.only('should success when poison at [4,0] and [4,4], poisonState is 17, player1 snake 0, player2 snake 3, hit=2', async () => {
    result = await testMove(zksnake, 0, 3, 2, {
      player1PoisonHit: false,
      player2PoisonHit: true,
      player1Snake: 0,
      player2Snake: 3
    }, poisonState)

    // eslint-disable-next-line no-unused-expressions
    expect(result.success, result.error).to.be.true
  });
});
