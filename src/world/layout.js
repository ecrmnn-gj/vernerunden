// Track layout: lane spacing and the length of the looping world.

export const LANE = 2.1, LOOP = 230, Z_NEAR = 18, ZC = Z_NEAR - LOOP / 2;
export const laneX = l => l * LANE;
