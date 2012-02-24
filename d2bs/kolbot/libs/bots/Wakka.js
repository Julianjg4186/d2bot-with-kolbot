var stopLvl = 25;

function Wakka() {
	function AutoLeaderDetect(destination) { // autoleader by Ethic
		var solofail, suspect;

		do {
			solofail = 0;
			suspect = getParty(); // get party object (players in game)

			do {
				if (suspect.name !== me.name) { // player isn't alone
					solofail += 1;
				}

				if (suspect.area === destination) { // first player in our party found in destination area...
					leader = suspect.name; // ... is our leader
					print("�c4Wakka: �c0Autodetected " + leader);
					return true;
				}
			} while (suspect.getNext()); 

			if (solofail === 0) { // empty game, nothing left to do
				return false;
			}

			delay(500);
		} while (!leader); // repeat until leader is found (or until game is empty)

		return false;
	};

	this.checkMonsters = function (range, dodge) {
		var monList = [],
			monster = getUnit(1);

		if (monster) {
			do {
				if (monster.y < 5565 && Attack.checkMonster(monster) && getDistance(me, monster) <= range) {
					if (!dodge) {
						return true;
					}

					monList.push(copyUnit(monster));
				}
			} while (monster.getNext());
		}

		if (!monList.length) {
			return false;
		}

		monList.sort(Sort.units);

		if (getDistance(me, monList[0]) < 25 && !checkCollision(me, monList[0], 0x4)) {
			Attack.dodge(monList[0], 25, monList);
		}

		return true;
	};

	this.getLayout = function (seal, value) {
		var sealPreset = getPresetUnit(108, 2, seal);

		if (!seal) {
			throw new Error("Seal preset not found. Can't continue.");
		}

		switch (seal) {
		case 396:
			if (sealPreset.roomy * 5 + sealPreset.y === value) {
				return 1;
			}

			break;
		case 394:
		case 392:
			if (sealPreset.roomx * 5 + sealPreset.x === value) {
				return 1;
			}

			break;
		}

		return 2;
	};

	this.getCoords = function () {
		this.vizCoords = this.getLayout(396, 5275) === 1 ? [7707, 5274] : [7708, 5298];
		this.seisCoords = this.getLayout(394, 7773) === 1 ? [7812, 5223] : [7809, 5193];
		this.infCoords = this.getLayout(392, 7893) === 1 ? [7860, 5314] : [7882, 5306];
	};

	this.checkBoss = function (name) {
		var i, boss,
			glow = getUnit(2, 131);

		if (glow) {
			for (i = 0; i < 10; i += 1) {
				if (me.getStat(12) >= stopLvl) {
					D2Bot.stop();
				}

				boss = getUnit(1, name);

				if (boss && boss.mode === 12) {
					return true;
				}

				delay(500);
			}

			return true;
		}

		return false;
	}

	this.getCorpse = function () {
		if (me.mode === 17) {
			me.revive();
		}

		var i, corpse,
			rval = false;

		corpse = getUnit(0, me.name, 17);

		if (corpse) {
			do {
				if (getDistance(me, corpse) <= 15) {
					Pather.moveToUnit(corpse);
					corpse.interact();
					delay(500);
					
					rval = true;
				}
			} while (corpse.getNext());
		}

		return rval;
	};

	this.followPath = function (dest) {
		var node,
			path = getPath(me.area, me.x, me.y, dest[0], dest[1], 0, 5);

		if (!path) {
			throw new Error("Failed go get path");
		}

		while (path.length > 0) {
			if (me.getStat(12) >= stopLvl) {
				D2Bot.stop();
			}
			
			if (me.mode === 17 || me.inTown) {
				return false;
			}

			if (!leaderUnit || !copyUnit(leaderUnit).x) {
				leaderUnit = getUnit(0, leader);
			}

			if (leaderUnit) {
				if (this.checkMonsters(45, true)) {
					path = getPath(me.area, me.x, me.y, dest[0], dest[1], 0, 5);

					delay(200);

					continue;
				}

				if (getDistance(me, leaderUnit) <= minDist) {
					delay(200);

					continue;
				}
			} else {
				// leaderUnit out of getUnit range but leader is still within reasonable distance - check party unit's coords!
				leaderPartyUnit = getParty(leader);

				if (leaderPartyUnit && getDistance(me, leaderPartyUnit.x, leaderPartyUnit.y) <= maxDist) {
					if (this.checkMonsters(45, true)) {
						path = getPath(me.area, me.x, me.y, dest[0], dest[1], 0, 5);

						delay(200);

						continue;
					}
				}
			}

			if (Pather.walkTo(path[0].x, path[0].y)) {
				path.shift();
			}
			
			this.getCorpse()
		}

		return true;
	};

	var i, safeTP, portal, viz, seis, inf, vizClear, seisClear, infClear, path, tick,
		minDist = 40,
		maxDist = 80,
		leaderUnit = null,
		leaderPartyUnit = null,
		leader = "";

	Town.goToTown(4);
	Town.doChores();
	Town.move("portalspot");

	if (AutoLeaderDetect(108)) {
		while (Misc.inMyParty(leader)) {
			if (me.getStat(12) >= stopLvl) {
				D2Bot.stop();
			}

			switch (me.area) {
			case 103:
				portal = Pather.getPortal(108, leader);

				if (portal) {
					if (!safeTP) {
						delay(5000);
					}

					Pather.usePortal(108, leader);
				}

				break;
			case 108:
				if (!safeTP) {
					if (this.checkMonsters(25, false)) {
						me.overhead("hot tp");
						Pather.usePortal(103, leader);
						this.getCorpse();

						break;
					} else {
						this.getCoords();

						safeTP = true;
					}
				}

				if (!vizClear) {
					if (!this.followPath(this.vizCoords)) {
						break;
					}

					if (tick && getTickCount() - tick >= 5000) {
						vizClear = true;
						tick = false;

						break;
					}
					
					if (this.checkBoss("grand vizier of chaos")) {
						if (!tick) {
							tick = getTickCount();
						}

						me.overhead("vizier dead");
					}

					break;
				}
				
				if (!seisClear) {
					if (!this.followPath(this.seisCoords)) {
						break;
					}

					if (tick && getTickCount() - tick >= 7000) {
						seisClear = true;
						tick = false;

						break;
					}
					
					if (this.checkBoss("lord de seis")) {
						if (!tick) {
							tick = getTickCount();
						}

						me.overhead("seis dead");
					}

					break;
				}

				if (!infClear) {
					if (!this.followPath(this.infCoords)) {
						break;
					}

					if (tick && getTickCount() - tick >= 2000) {
						infClear = true;
						tick = false;

						break;
					}

					if (this.checkBoss("infector of souls")) {
						if (!tick) {
							tick = getTickCount();
						}

						me.overhead("infector dead");
					}

					break;
				}

				Pather.moveTo(7767, 5263);

				break;
			}

			if (me.mode === 17) {
				me.revive();
			}

			delay(200);
		}
	} else {
		throw new Error("Empty game.");
	}

	return true;
}