import {
  SmartContract,
  Field,
  MerkleTree,
  MerkleWitness,
  state,
  State,
  method,
  DeployArgs,
  Signature,
  PublicKey,
  Permissions,
  Bool,
} from 'snarkyjs';

import { assertRootUpdateValid } from './offChainStorage.js';

export const height = 256;

class OffchainStorageMerkleWitness extends MerkleWitness(height) {}

export class OffChainStorageTestContract extends SmartContract {
  @state(Field) root = State<Field>();
  @state(Field) rootNumber = State<Field>();
  @state(PublicKey) serverPublicKey = State<PublicKey>();

  _serverPublicKey: PublicKey;

  deploy(args: DeployArgs, serverPublicKey: PublicKey) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this._serverPublicKey = serverPublicKey;

    const tree = new MerkleTree(height);
    const root = tree.getRoot();
    this.root.set(root);

    const rootNumber = Field(0);
    this.rootNumber.set(rootNumber);

    this.serverPublicKey.set(this._serverPublicKey);
  }

  @method update(
    leafIsEmpty: Bool,
    oldNum: Field,
    num: Field,
    path: OffchainStorageMerkleWitness,
    storedNewRoot__: Field,
    storedNewRootNumber: Field,
    storedNewRootSignature: Signature
  ) {
    let root = this.root.get();
    this.root.assertEquals(root);

    let rootNumber = this.rootNumber.get();
    this.rootNumber.assertEquals(rootNumber);

    let serverPublicKey = this.serverPublicKey.get();
    this.serverPublicKey.assertEquals(serverPublicKey);

    let leaf = [oldNum];
    let newLeaf = [num];

    // newLeaf can be a function of the existing leaf
    newLeaf[0].assertGt(leaf[0]);

    const updates = [
      {
        leaf,
        leafIsEmpty,
        newLeaf,
        newLeafIsEmpty: Bool(false),
        leafWitness: path,
      },
    ];

    const storedNewRoot = assertRootUpdateValid(
      serverPublicKey,
      rootNumber,
      root,
      updates,
      storedNewRootNumber,
      storedNewRootSignature
    );

    this.root.set(storedNewRoot);
    this.rootNumber.set(storedNewRootNumber);
  }
}
