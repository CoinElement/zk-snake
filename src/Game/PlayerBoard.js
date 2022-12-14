import React from 'react';
import { ContractUtxos } from '../storage';
import { Whatsonchain } from '../web3';
import {
  SQUARE_STATE,
  stateToClass,
  generateEmptyLayout,
  putEntityInLayout,
  indexToCoords,
  calculateOverhang,
  canBePlaced,
} from './layoutHelpers';

export const PlayerBoard = ({
  currentlyPlacing,
  setCurrentlyPlacing,
  rotateShip,
  placeShip,
  placedShips,
  hitsByComputer,
  hitsProofToComputer,
  playSound,
}) => {
  // Player ships on empty layout
  let layout = placedShips.reduce(
    (prevLayout, currentShip) =>
      putEntityInLayout(prevLayout, currentShip, SQUARE_STATE.ship),
    generateEmptyLayout()
  );

  // Hits by computer
  layout = hitsByComputer.reduce(
    (prevLayout, currentHit) =>
      putEntityInLayout(prevLayout, currentHit, currentHit.type),
    layout
  );

  layout = placedShips.reduce(
    (prevLayout, currentShip) =>
      currentShip.sunk
        ? putEntityInLayout(prevLayout, currentShip, SQUARE_STATE.ship_sunk)
        : prevLayout,
    layout
  );

  const isPlacingOverBoard = currentlyPlacing && currentlyPlacing.position != null;
  const canPlaceCurrentShip = isPlacingOverBoard && canBePlaced(currentlyPlacing, layout);

  if (isPlacingOverBoard) {
    if (canPlaceCurrentShip) {
      layout = putEntityInLayout(layout, currentlyPlacing, SQUARE_STATE.ship);
    } else {
      let forbiddenShip = {
        ...currentlyPlacing,
        length: currentlyPlacing.length - calculateOverhang(currentlyPlacing),
      };
      layout = putEntityInLayout(layout, forbiddenShip, SQUARE_STATE.forbidden);
    }
  }




  let squares = layout.map((square, index) => {
    const hitProofStatus = hitsProofToComputer.get(index);
    return (
      <div
        onMouseDown={rotateShip}
        onClick={() => {
          if (canPlaceCurrentShip) {
            playSound('click');
            placeShip(currentlyPlacing);
          } else if(hitProofStatus && hitProofStatus.status === 'verified') {
            const utxo = ContractUtxos.getComputerUtxoByIndex(index);
            if(utxo) {
              window.open(Whatsonchain.getTxUri(utxo.utxo.txId), '_blank').focus();
            } else {
              console.error('utxo not found for index: ', index)
            }
          }
        }}
        className={`square ${stateToClass[square]} ${hitProofStatus ? hitProofStatus.status : ''}`}
        key={`square-${index}`}
        id={`square-${index}`}
        onMouseOver={() => {
          if (currentlyPlacing) {
            setCurrentlyPlacing({
              ...currentlyPlacing,
              position: indexToCoords(index),
            });
          }
        }}
      />
    );
  });

  return (
    <div>
      <h2 className="player-title">You</h2>
      <div className="board">{squares}</div>
    </div>
  );
};
