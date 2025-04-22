/************************************************************************
 *
 * Copyright (C) 2020 Ryerson University
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License v3.0 as published
 * by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. For more details
 * see <https://www.gnu.org/licenses/gpl-3.0.html>
 *
 ***********************************************************************/

const utils = angular.module('utils', ['ngCookies']);
const app = angular.module('amaze', ['ngRoute', 'ngSanitize', 'utils']);

app.config(['$routeProvider', function($routeProvider) {
		
	$routeProvider.when('/', {
			templateUrl : '_/tpl/splash.tpl.html',
			controller  : 'splashCtrl'
		}).when('/intro/', {
			templateUrl : '_/tpl/intro.tpl.html',
			controller  : 'introCtrl'
		}).when('/menu/', {
			templateUrl : '_/tpl/menu.tpl.html',
			controller  : 'menuCtrl'
		}).when('/gameinfo/:page?', {
			templateUrl : '_/tpl/gameinfo.tpl.html',
			controller  : 'gameInfoCtrl'
		}).when('/level/', {
			templateUrl : '_/tpl/level.tpl.html',
			controller  : 'levelCtrl'
		}).when('/puzzle1/', {
			templateUrl : '_/tpl/puzzle1.tpl.html',
			controller  : 'puzzle1Ctrl'
		}).when('/puzzle2/', {
			templateUrl : '_/tpl/puzzle2.tpl.html',
			controller  : 'puzzle2Ctrl'
		}).when('/outro/', {
			templateUrl : '_/tpl/intro.tpl.html',
			controller  : 'outroCtrl'
		}).when('/summary/', {
			templateUrl : '_/tpl/summary.tpl.html',
			controller  : 'summaryCtrl'
		});
	}
	
]).run(['$rootScope', '$http', '$location', '$storage', '$route', '$interval', '$timeout',
		
	function($rootScope, $http, $location, $storage, $route, $interval, $timeout) {
		
		$rootScope.isMobile = (('ontouchstart' in window) ||
			(navigator.maxTouchPoints > 0) ||
			(navigator.msMaxTouchPoints > 0));
		
		$rootScope.l10n = {};
		$rootScope.intro = [];
		$rootScope.levels = [];
		$rootScope.outro = [];
		
		$rootScope.game = $storage.getObject(app.name) || {
			"uuid": generateUUID(),
			"test": true,
			"settings": {
				"locale": "en",
				"music": true,
				"animation": true,
				"fullscreen": false
			},
			"started": false,
			"firstTime": true,
			"completed": false,
			"allGems": false,
			"level": {
				"id": 0,
				"floorplan": [],
				"currTile": {},
				"nextTileId": -1
			},
			"inventory": []
		};
		
		$rootScope.game.settings.locale = $rootScope.game.settings.locale || "en";
		
		$rootScope.saveState = function() {
			$storage.setObject(app.name, $rootScope.game);
		};
		
		$rootScope.loadData = function() {
			$http.get('_/l10n/locale_' + $rootScope.game.settings.locale + '.json')
				.success(function(data) {
					$rootScope.l10n = data.elements;
				})
				.error(function(data, status) {
					console.log('error: ' + status);
				});
			
			$http.get('_/' + app.name + '_data.json')
				.success(function(data) {
					$rootScope.intro = data.intro;
					$rootScope.levels = data.levels;
					$rootScope.outro = data.outro;
					$rootScope.saveState();
					preloadAssets();
				})
				.error(function(data, status) {
					console.log('error: ' + status);
				});
		}
		
		$rootScope.loadData();

		$rootScope.changeLocale = function() {
			$rootScope.saveState();
			$rootScope.loadData();
		}
		function preloadAssets() {
			let queue, assets, sounds;

			queue = new createjs.LoadQueue();
			queue.installPlugin(createjs.Sound);
			assets = [
				{id:"book", src: "_/img/book/book_bg.png"}
			];
			sounds = [
				{id:"main_theme", src:"_/snd/theme_music.mp3"},
				{id:"click", src:"_/snd/click.mp3"},
				{id:"get_item", src:"_/snd/get_item.mp3"},
				{id:"error", src:"_/snd/error.mp3"},
				{id:"success", src:"_/snd/success.mp3"},
				{id:"exit", src:"_/snd/ding.mp3"},
				{id:"hit_wall", src:"_/snd/wall.mp3"},
				{id:"explosion", src:"_/snd/explosion.mp3"},
				{id:"pop", src:"_/snd/pop.mp3"},
				{id:"boing", src:"_/snd/boing.mp3"},
				{id:"win", src:"_/snd/fanfare.mp3"}
			];
			_.each($rootScope.intro, function(el, ind) {
				assets.push({id: "intro_" + (++ind), src: el.image});
			});
			_.each($rootScope.outro, function(el, ind) {
				assets.push({id: "outro_" + (++ind), src: el.image});
			});

			assets = assets.concat(sounds);

			queue.on("complete", function() {
				$rootScope.assetsLoaded = true;
				$rootScope.$apply();
			}, this);

			queue.loadManifest(assets);

		}

		$rootScope.playSound = function(name, props, instance) {
			let conf, inst;
			if ( instance && $rootScope[instance] ) { 
				inst = $rootScope[instance];
				if ( inst.playState !== "playSucceeded" ) {
					inst.play();
				}
			} else {
				conf = new createjs.PlayPropsConfig().set(_.extend({
					loop: 0,
					volume: .1
				}, props));
				$rootScope[instance] = createjs.Sound.play(name, conf);
			}
		}

		$rootScope.stopSound = function(instance) {
			if ($rootScope[instance]) {
				$rootScope[instance].stop();
			}
		};

		$rootScope.ambientSoundName = "main_theme";

		$rootScope.toggleAmbientSound = function($event) {
			let instance = "ambientSound";
			if ($event.type === 'click' || $event.keyCode === 32 || $event.keyCode === 13) {
				$event.preventDefault();
				if ($rootScope.game.settings.music) {
					$rootScope.stopSound(instance);
				} else {
					$rootScope.playSound($rootScope.ambientSoundName, {loop: -1, volume: .1}, instance);
				}
				$rootScope.game.settings.music = !$rootScope.game.settings.music;
				$rootScope.saveState();
				$(".map").trigger("focus");
			}
		};
		
		$rootScope.toggleAnimation = function($event) {
			let exit, blob, prof;
			if ($event.type === 'click' || $event.keyCode === 32 || $event.keyCode === 13) {
				$event.preventDefault();
				exit = _.filter($rootScope.game.level.floorplan, function(item) {
					return item.class.indexOf("exit") >= 0;
				});
				blob = _.filter($rootScope.game.level.floorplan, function(item) {
					return item.class.indexOf("blob") >= 0;
				});
				prof = _.filter($rootScope.game.level.floorplan, function(item) {
					return item.class.indexOf("prof") >= 0;
				});
				
				if ($rootScope.game.settings.animation) {
					if (exit.length) { exit[0].class = exit[0].class.replace("exit_animated", "exit"); }
					if (blob.length) { blob[0].class = blob[0].class.replace("blob_animated", "blob"); }
					if (prof.length) { prof[0].class = prof[0].class.replace("prof_animated", "prof"); }
				} else {
					if (exit.length) { exit[0].class = exit[0].class.replace("exit", "exit_animated"); }
					if (blob.length) { blob[0].class = blob[0].class.replace("blob", "blob_animated"); }
					if (prof.length) { prof[0].class = prof[0].class.replace("prof", "prof_animated"); }
				}
				$rootScope.game.settings.animation = !$rootScope.game.settings.animation;
				$rootScope.saveState();
				$(".map").trigger("focus");
			}
		};
		
		$rootScope.toggleDialogFocus = function(show) {
			let $focusable, $overlay;

			$overlay = $(".overlay");
			$focusable = $('button, input, select, textarea, a, [tabindex]').filter( function(ind, elem) {
				return !$overlay.has(elem).length;
			});

			if ( show ) {
				$focusable.each( function(index, item) {
					let $me = $(item);
					if( item.hasAttribute('tabindex') ) {
						$me.data({ 'tabindex': $me.attr('tabindex') });
					}
					$me.attr('tabindex', -1);
				});
				$rootScope.focusElement( $overlay.find('.dialog') );
			} else {
				$focusable.each( function(index, item) {
					let $me = $(item);
					if ( $me.data('tabindex') ) {
						$me.attr('tabindex', $me.data('tabindex') );
					} else {
						$me.removeAttr('tabindex');
					}
				});
			}
		};

		$rootScope.focusElement = function(selector) {
			$timeout( function(){
				if (typeof selector === 'string') {
					$(selector).trigger("focus");
				} else {
					selector.trigger("focus");
				}
			}, 300);
		};

		$rootScope.openMenu = function($event) {
			$event.preventDefault();
			if ($event.type === 'click' || $event.keyCode === 32 || $event.keyCode === 13) {
				$location.path("/menu");
			}
		};

		$rootScope.moveFocusOnTab = function ($event) {
			let $focusable, ind, next;
			$event.preventDefault();
			if ($event.keyCode === 9) {
				$focusable = $("button, [tabindex]").filter(":visible");
				ind = $focusable.index( $(":focus") );
				if ($event.shiftKey) {
					next = (ind === 0) ? $focusable.length - 1 : --ind;
				} else {
					next = (ind > $focusable.length - 2) ? 0 : ++ind;
				}
				$focusable.eq(next).trigger("focus");
			}
		};
		$rootScope.noMouseMessage = function() {
			$rootScope.updateStatus($rootScope.l10n.TXT_NO_MOUSE, true);
		}


		$rootScope.actionLog = "";

		$rootScope.updateStatus = function(str, persist) {
			$timeout.cancel($rootScope.statusTimer);
			$rootScope.actionLog = str;
			if(!persist) {
				$rootScope.statusTimer = $timeout(function () {
					$rootScope.actionLog = "";
				}, 600);
			}
		};

	}
]);

app.controller('splashCtrl', ['$rootScope', '$scope', '$location',
	function($rootScope, $scope, $location) {

		$rootScope.assetsLoaded = true;
		$rootScope.saveState();
		
		$scope.startGame = function() {
			$location.path("/menu/");
		};
		
	}
]);

app.controller('menuCtrl', ['$rootScope', '$scope', '$location',
	function($rootScope, $scope, $location) {

		$rootScope.stopSound("ambientSound");

		if (!$rootScope.assetsLoaded) {
			$location.path('/');
		} else {
			$scope.startNew = function() {
				$rootScope.game.started = true;
				$rootScope.game.firstTime = true;
				$rootScope.game.completed = false;
				$rootScope.game.level = {
					id: 0,
					floorplan: [],
					currTile: {},
					nextTileId: -1
				};
				$rootScope.game.inventory = [];
				$rootScope.game.allGems = false;
				$rootScope.saveState();
				$location.path('/intro/');
			};
			$scope.resumeSaved = function() {
				if ($rootScope.game.completed) {
					$location.path('/summary/');
				} else {
					$location.path('/level/');
				}
			};
			$scope.showInstructions = function() {
				$location.path('/gameinfo/howto');
			};
			$scope.showObjectives = function() {
				$location.path('/gameinfo/objectives');
			};
		}
	}
]);

app.controller('gameInfoCtrl', ['$rootScope', '$scope', '$location', '$route',
	function($rootScope, $scope, $location, $route) {

		let page;

		page = $route.current.pathParams.page;

		if ( page && page.length ) {
			
			$scope.message = $rootScope.l10n["TXT_PAGE_" + page.toUpperCase()];
			$rootScope.focusElement(".content");
			$scope.gameInfoKeydownHandler = function ($event) {
				//$event.preventDefault();
				if ($event.keyCode === 27) {
					$location.path("/menu");
				}
			};

		} else {
			$location.path("/menu");
		}

	}
]);

app.controller('introCtrl', ['$rootScope', '$scope', '$location', '$timeout',
	function($rootScope, $scope, $location, $timeout) {

		if (!$rootScope.assetsLoaded) {
			$location.path('/');
		} else {
			$scope.currentSlide = 0;
			$scope.continueGame = function($event) {
				if ($event.type === 'click' || $event.keyCode === 39) {
					$scope.message = "";
					if ($scope.currentSlide < $rootScope.intro.length) {
						$scope.isVisible = false;
						$timeout(function () {
							$scope.background = $rootScope.intro[$scope.currentSlide].image;
							$scope.message = $rootScope.l10n[$rootScope.intro[$scope.currentSlide].content]; // $rootScope.intro[$scope.currentSlide].content;
							$scope.currentSlide++;
							$scope.isVisible = true;
							$rootScope.focusElement("#boxContent");
						}, 800, true, $scope);
					} else {
						$scope.isVisible = false;
						$location.path('/level/');
					}
				}
			};
			$scope.continueGame({'type': 'click'});
			$scope.skipIntro = function() {
				$scope.isVisible = false;
				$location.path('/level/');
			}
		}	
	}
]);

app.controller('levelCtrl', ['$rootScope', '$scope', '$location', '$storage', '$route', '$timeout',
	function($rootScope, $scope, $location, $storage, $route, $timeout) {

		let level, item, obj, ind = 0;

		if (!$rootScope.assetsLoaded) {
			$location.path('/menu/');
		} else {
			if ($rootScope.game.settings.music) {
				$rootScope.playSound($rootScope.ambientSoundName, {loop: -1, volume: .1}, "ambientSound");
			}

			if ($rootScope.game.firstTime) {
				$scope.message = $rootScope.l10n.TXT_PAGE_HOWTO;
				$rootScope.toggleDialogFocus(true);
				$rootScope.game.firstTime = false;
				$rootScope.saveState();
			} else {
				$scope.message = "";
			}
			$scope.levelCompleted = false;
			level = $rootScope.levels[ $rootScope.game.level.id ];

			if (!$rootScope.game.level.floorplan.length) {

				$rootScope.game.level.floorplan = [];
				_.each(level.floorplan, function (row, x) {
					_.each(row, function (tile, y) {
						item = _.findWhere(level.items, {row: x, col: y});
						obj = {
							"id": ind++,
							"class": item ? item.class : tile,
							"collectable": item ? item.collectable : false,
							"row": x,
							"col": y,
							"data": item && item.data ? _.clone(item.data) : null
						};
						if (tile.indexOf("exit") >= 0 ) {
							if ($rootScope.game.settings.animation) {
								obj.class = obj.class.replace("exit", "exit_animated");
							}
						}
						if (tile.indexOf("prof") >= 0 ) {
							if ($rootScope.game.settings.animation) {
								obj.class = obj.class.replace("prof", "prof_animated");
							}
						}
						if (tile === "bubble") {
							obj.data = { attempts: 5 };
						}
						$rootScope.game.level.floorplan.push(obj);
						if (tile === "blob") {
							obj.class = $rootScope.game.settings.animation ? "blob_animated" : "blob";
							obj.class += " entry";
							$rootScope.game.level.currTile = $rootScope.game.level.floorplan[$rootScope.game.level.floorplan.length - 1];
						}
					});
				});
			}
			$rootScope.game.level.lesson = level.lesson;
			$rootScope.game.level.description = level.description;

			$scope.openHelp = function($event) {
				if ($event.type === 'click' || $event.keyCode === 32 || $event.keyCode === 13) {
					$scope.message = $rootScope.l10n.TXT_PAGE_HOWTO;
					$rootScope.toggleDialogFocus(true);
				}
			};

			$scope.closePopupDialog = function() {
				$rootScope.toggleDialogFocus(false);
				$scope.message = "";
				$scope.isBook = false;
				$rootScope.updateStatus("");
				if ($scope.levelCompleted) {
					$timeout.cancel($scope.timeout);
					if ($rootScope.game.level.id < $rootScope.levels.length - 1) {
						$rootScope.game.inventory = _.filter($rootScope.game.inventory, function(item) {
							return item.class.indexOf("gem") >= 0;
						});
						$rootScope.game.level.id += 1;
						$rootScope.game.level.floorplan = [];
						$rootScope.game.level.currTile = {};
						$rootScope.saveState();
						$route.reload()
					} else {
						$location.path("/outro");
					}
				} else {
					if ($scope.isChest) {
						$rootScope.game.inventory.push({
							id: $scope.nextTile.id,
							class: "tile " + $scope.nextTile.data.treasure.class
						});
						$scope.isChest = false;
					}
					if ($scope.isProf && !$rootScope.game.allGems) {
						$rootScope.game.allGems = true;
						_.each($rootScope.game.inventory, function(item) {
							item.counter += 3;
						});
						$rootScope.playSound("get_item");
						$timeout( function() { $rootScope.playSound("get_item") }, 50);
						$timeout( function() { $rootScope.playSound("get_item") }, 100);
						$timeout( function() { $rootScope.playSound("get_item") }, 150);
					}
					$rootScope.saveState();
					$(".map").trigger("focus");
				}
			};

			$scope.dialogKeyDownHandler = function(event) {
				event.preventDefault();
				event.stopPropagation();
				if ( event.keyCode === 27) {
					$scope.closePopupDialog();
				}
			};

            $scope.tileClickHandler = function($event, tile) {
                if (tile.class === "bubble") {
                    tile.class="green";
                    $rootScope.playSound("pop");
                }
            };

			$scope.mapKeyDownHandler = function(event) {
				let row, col;
				row = $rootScope.game.level.currTile.row;
				col = $rootScope.game.level.currTile.col;
				switch (event.keyCode) {
					case 37: // left
						takeAction(event, row, --col, "left");
						break;
					case 38: // top
						takeAction(event, --row, col, "up");
						break;
					case 39: // right
						takeAction(event, row, ++col, "right");
						break;
					case 40: // bottom
						takeAction(event, ++row, col, "down");
						break;
					case 9:
						$rootScope.moveFocusOnTab(event);
						break;
					default:
						break;
				}
				$rootScope.saveState();
			};

			$scope.$on('$viewContentLoaded', function(){
				$(".map").trigger("focus");
			});
		}

		function takeAction(event, row, col, dir) {
			let ind, inventoryIndex, inventoryItem, switchDelay, msg;
			ind = _.findWhere($rootScope.game.level.floorplan, {row: row, col: col}).id;
			$scope.nextTile = $rootScope.game.level.floorplan[ind];
			
			if ($scope.nextTile.collectable) {

				if ($scope.nextTile.class.indexOf("gem") >=0) {
					inventoryIndex = _.findIndex($rootScope.game.inventory, {class: "tile " + $scope.nextTile.class});
					if (inventoryIndex >= 0) {
						++$rootScope.game.inventory[inventoryIndex].counter;
					} else {
						$rootScope.game.inventory.push({
							id: $scope.nextTile.id,
							class: "tile " + $scope.nextTile.class,
							counter: 1
						});
					}
				} else {
					$rootScope.game.inventory.push({
						id: $scope.nextTile.id,
						class: "tile " + $scope.nextTile.class
					});
				}
				$rootScope.updateStatus($rootScope.l10n.TXT_COLLECTED + $rootScope.l10n[$scope.nextTile.data.name], true);
				$rootScope.playSound("get_item");
				$scope.nextTile.collectable = false;
				$scope.nextTile.class = "green";
				moveBlob($scope.nextTile);
				
			} else {
				
				switch ($scope.nextTile.class) {

					case "green":
						if (dir === "left") {
							msg = $rootScope.l10n.TXT_MOVE_LEFT;
						} else if(dir === "right") {
							msg = $rootScope.l10n.TXT_MOVE_RIGHT;
						} else if(dir === "up") {
							msg = $rootScope.l10n.TXT_MOVE_UP;
						} else if(dir === "down") {
							msg = $rootScope.l10n.TXT_MOVE_DOWN;
						}
						$rootScope.updateStatus("<span class='readersonly'>" + msg + "</span>");
						moveBlob($scope.nextTile);
						break;

					case "wall":
						$rootScope.updateStatus("<span class='readersonly'>" + $rootScope.l10n.TXT_WALL + "</span>");
						break;

					case "green entry":
						$rootScope.updateStatus("<span class='readersonly'>"  + $rootScope.l10n.TXT_LEVEL_ENTRANCE + ($rootScope.game.level.id + 1) + ": " + $rootScope.game.level.description + "</span>", true);
						moveBlob($scope.nextTile);
						break;

					case "exit":
					case "exit down":
					case "exit_animated":
					case "exit_animated down":

						$rootScope.updateStatus($rootScope.l10n.TXT_EXIT, true);
						$scope.message = $rootScope.l10n[level.lesson];
						$rootScope.toggleDialogFocus(true);
						$scope.levelCompleted = true;
						$rootScope.playSound("exit", {volume: .1});
						//moveBlob($scope.nextTile);
						break;

					case "book":

						$rootScope.updateStatus($rootScope.l10n.TXT_DIARY);
						$scope.isBook = true;
						$scope.message = $rootScope.l10n[$scope.nextTile.data.content];
						$rootScope.updateStatus($rootScope.l10n.TXT_CLOSE_DIARY, true);
						$rootScope.toggleDialogFocus(true);
						break;

					case "door":

						if ($scope.nextTile.data.requires >= 0) {
							inventoryItem = _.findWhere($rootScope.game.inventory, { "id": $scope.nextTile.data.requires });
							if ( inventoryItem ) {
								$rootScope.game.inventory = _.without($rootScope.game.inventory, inventoryItem);
								$rootScope.updateStatus($rootScope.l10n.TXT_DOOR, true);
								$scope.nextTile.class = "green";
								$rootScope.playSound("success");
							} else {
								$rootScope.updateStatus($rootScope.l10n.TXT_LOCKED_DOOR, true);
								$rootScope.playSound("hit_wall");
							}
						} else {
							$rootScope.updateStatus($rootScope.l10n.TXT_REMOTE_CONTROL_DOOR, true);
							$rootScope.playSound("hit_wall");
						}
						break;

					case "secret":
						
						if($scope.nextTile.data.attempts > 1) {
							switch($scope.nextTile.data.attempts) {
								case 3:
									$rootScope.updateStatus($rootScope.l10n.TXT_CRACKED_WALL, true);
									break;
								case 2:
									$rootScope.updateStatus($rootScope.l10n.TXT_CRACKED_WALL_2, true);
									break;
							}
							$scope.nextTile.data.attempts--;
							$rootScope.playSound("hit_wall");
							$scope.nextTile.class = "secret shaking";
							$timeout( function () { $scope.nextTile.class = "secret"; }, 100 );
						} else {
							$rootScope.updateStatus($rootScope.l10n.TXT_SECRET, true);
							$scope.nextTile.class = $scope.nextTile.data.treasure.class;
							$scope.nextTile.collectable = $scope.nextTile.data.treasure.collectable;
							let treasure_name = $scope.nextTile.data.treasure.name;
							$scope.nextTile.data = {
								"name": treasure_name.length ? treasure_name : ""
							}
							$rootScope.playSound("explosion");
						}
						break;

					case "chest":

						inventoryItem = _.findWhere($rootScope.game.inventory, { "id": $scope.nextTile.data.requires });
						if ( inventoryItem ) {
							$rootScope.game.inventory = _.without($rootScope.game.inventory, inventoryItem);
							$rootScope.updateStatus($rootScope.l10n.TXT_COLLECTED + $rootScope.l10n[$scope.nextTile.data.treasure.name], true);
							$scope.nextTile.class = "chest unlocked";
							$scope.message = "<div class='treasure " + $scope.nextTile.data.treasure.class + "'></div>";
							$scope.isChest = true;
							$rootScope.toggleDialogFocus(true);
							$rootScope.playSound("success");
						} else {
							$rootScope.updateStatus($rootScope.l10n.TXT_LOCKED_CHEST, true);
							$rootScope.playSound("hit_wall");
						}
						break;
						
					case "chest unlocked":
						$rootScope.updateStatus($rootScope.l10n.TXT_EMPTY_CHEST, true);
						$rootScope.playSound("hit_wall");
						break;

					case "switch":
						$rootScope.playSound("click");
						inventoryItem = _.findWhere($rootScope.game.inventory, { "id": $scope.nextTile.data.requires });
						controlledItem = $rootScope.game.level.floorplan[ $scope.nextTile.data.controls ];
						switchDelay = $scope.nextTile.data.timeout;
						if (inventoryItem) {
							$scope.nextTile.class = "switch on frozen";
							$rootScope.updateStatus($rootScope.l10n.TXT_SWITCH_FROZEN, true);
							$rootScope.game.inventory = _.without($rootScope.game.inventory, inventoryItem);
							//switchDelay *= 3;
						} else {
							$scope.nextTile.class = "switch on";
							$rootScope.updateStatus($rootScope.l10n.TXT_SWITCH_ON, true);
							$scope.timeout = $timeout(function() {
								let switchTile, doorTile;
								switchTile = arguments[0];
								doorTile = $rootScope.game.level.floorplan[ switchTile.data.controls ];
								$rootScope.playSound("click");
								switchTile.class = "switch";
								$rootScope.updateStatus($rootScope.l10n.TXT_SWITCH_OFF, true);
								doorTile.class = "door blinking";
								$timeout(function() { arguments[0].class = "door"; }, 1200, true, doorTile);
							}, switchDelay, true, $scope.nextTile);
						}
						controlledItem.class = "green";
						break;
						
					case "switch on":
						$rootScope.updateStatus($rootScope.l10n.TXT_SWITCH_ON, true);
						break;

					case "switch on frozen":
						$rootScope.updateStatus($rootScope.l10n.TXT_SWITCH_FROZEN, true);
						break;

					case "bubble":
						if (dir === "left") {
							msg = $rootScope.l10n.TXT_POP_MOVE_LEFT;
						} else if(dir === "right") {
							msg = $rootScope.l10n.TXT_POP_MOVE_RIGHT;
						} else if(dir === "up") {
							msg = $rootScope.l10n.TXT_POP_MOVE_UP;
						} else if(dir === "down") {
							msg = $rootScope.l10n.TXT_POP_MOVE_DOWN;
						}
						if (event.shiftKey && event.ctrlKey) {
							$scope.nextTile.class = "green";
							$rootScope.saveState();
							moveBlob($scope.nextTile);
						$rootScope.updateStatus("<span class='readersonly'>" + msg + "</span>", true);
							$rootScope.playSound("pop");
						} else {
							if ( --$scope.nextTile.data.attempts % 5 === 0) {
								$rootScope.updateStatus("<span class='readersonly'>" + $rootScope.l10n.TXT_BALLOON_2_A11Y + "</span>" + $rootScope.l10n.TXT_BALLOON_2, true);
							} else {
								$rootScope.updateStatus($rootScope.l10n.TXT_BALLOON);
							}
							$scope.nextTile.class = $scope.nextTile.class + " wobble";
							$rootScope.playSound("boing", {volume: 1});

							$timeout(function () {
								let nextTile = arguments[0];
								nextTile.class = "bubble";
								$rootScope.saveState();
							}, 300, true, $scope.nextTile);
						}
						break;

					case "puzzle1":

						$rootScope.game.level.nextTileId = ind;
						$rootScope.updateStatus($rootScope.l10n.TXT_LOCKED_DOOR, true);
						$rootScope.playSound("hit_wall");
						$rootScope.saveState();
						$location.path('/puzzle1');
						break;

					case "puzzle2":

						$rootScope.game.level.nextTileId = ind;
						$rootScope.updateStatus($rootScope.l10n.TXT_LOCKED_DOOR, true);
						$rootScope.playSound("hit_wall");
						$rootScope.saveState();
						$location.path('/puzzle2');
						break;

					case "prof":
					case "prof_animated":

						$rootScope.updateStatus($rootScope.l10n.TXT_PROF, true);
						$scope.isProf = true;
						if ($rootScope.game.allGems) {
							$scope.message =  $rootScope.l10n[$scope.nextTile.data.short];
						} else {
							$scope.message =  $rootScope.l10n[$scope.nextTile.data.long];
						}
						$rootScope.saveState();
						$rootScope.toggleDialogFocus(true);
						break;

					case "door last":
						if ($rootScope.game.allGems) {
							$location.path("/outro");
						} else {
							$rootScope.updateStatus($rootScope.l10n.TXT_NOT_ENOUGH_GEMS, true);
						}
						break;
				}
			}
		}

		function moveBlob(nextTile) {
			let blobClass, currTile;
			blobClass = $rootScope.game.settings.animation ? "blob_animated" : "blob";
			currTile = _.findWhere($rootScope.game.level.floorplan, {"id": $rootScope.game.level.currTile.id});
			currTile.class = currTile.class.replace(blobClass, "green");
			nextTile.class = nextTile.class.replace("green", blobClass);
			$rootScope.game.level.currTile = nextTile;
		}
	}
]);

app.controller('puzzle1Ctrl', ['$rootScope', '$scope', '$location', '$timeout',
	function($rootScope, $scope, $location, $timeout) {

		let nextTile, correctOrder, pressedOrder;

		correctOrder = [2,0,1,3];
		pressedOrder = [];

		$rootScope.focusElement(".content");

		$scope.buttons = [
			{ pressed: false, label: "C" },
			{ pressed: false, label: "A" },
			{ pressed: false, label: "D" },
			{ pressed: false, label: "B" }
		];
		$scope.locked = true;
		$scope.error = true;
		$scope.message = $rootScope.l10n.TXT_MESSAGE_LOCKED;
		nextTile = $rootScope.game.level.floorplan[$rootScope.game.level.nextTileId];
		$scope.showPanel = nextTile.ready;
		$scope.hint = $rootScope.l10n[nextTile.data.hint];
		
		$scope.checkForMissingPlate = function() {
			$scope.inventoryItem = _.findWhere($rootScope.game.inventory, { "id": nextTile.data.requires });
			if ( $scope.inventoryItem ) {
				nextTile.ready = true;
				$scope.showPanel = nextTile.ready;
				$rootScope.game.inventory = _.without($rootScope.game.inventory, $scope.inventoryItem);
				$rootScope.actionLog = "";
				$rootScope.saveState();
			}
			if (!$scope.showPanel) {
				$rootScope.updateStatus($rootScope.l10n.TXT_MISSING_PIECE, true);
			}
		};

		$scope.puzzle1KeyDownHandler = function(event) {
			switch (event.keyCode) {
				case 27:
					$location.path('/level');
					break;
				case 9:
					$rootScope.moveFocusOnTab(event);
					break;
			}
		};
		$scope.toggleButton = function($event, $index) {
			let btn = $scope.buttons[$index];
			switch ($event.keyCode) {
				case 13:
				case 32:
					if (!btn.pressed) {
						btn.pressed = true;
						pressedOrder.push($index);
						$rootScope.playSound("click");
					}
					if (pressedOrder.length === $scope.buttons.length) {
						validatePuzzle();
					}
					break;
				case 37: // left
				case 38: // top
					if($index > 0) {
						$(".togglebutton").eq(--$index).trigger("focus");
					}
					break;
				case 39: // right
				case 40: // bottom
					if($index < $scope.buttons.length - 1) {
						$(".togglebutton").eq(++$index).trigger("focus");
					}
					break;
				default:
					break;
			}
		}
		function validatePuzzle() {
			let solved = true;
			for(let i = 0, l = pressedOrder.length; i < l; i++) {
				if (pressedOrder[i] !== correctOrder[i]) {
					solved = false;
					break;
				}
			}
			if (solved && $scope.showPanel) {
				$scope.locked = false;
				$scope.message = $rootScope.l10n.TXT_MESSAGE_UNLOCKED;
				$scope.hint = "";
				$rootScope.playSound("success");
				nextTile.class = "green";
				nextTile.data.solved = true;
				$timeout(function(){ $location.path('/level'); }, 1000);
			} else {
				_.each($scope.buttons, function(item) { item.pressed = false; })
				pressedOrder = [];
				$scope.error = true;
				$scope.message = $rootScope.l10n.TXT_MESSAGE_ERROR;
				$timeout(function(){ $scope.error = false; $scope.message = $rootScope.l10n.TXT_MESSAGE_LOCKED; }, 1200);
				$rootScope.playSound("error");
			}
		}

	}
]);

app.controller('puzzle2Ctrl', ['$rootScope', '$scope', '$location', '$timeout',
	function($rootScope, $scope, $location, $timeout) {
		let nextTile, inventoryItem;

		$rootScope.focusElement(".content");

		$scope.buttons = 'AFEKBLOIX';
		$scope.buttons.message = "";
		$scope.message = "";
		$scope.flippedOver = false;
		$scope.pictureInFocus = false;

		nextTile = $rootScope.game.level.floorplan[$rootScope.game.level.nextTileId];
		inventoryItem = _.findWhere($rootScope.game.inventory, { "id": nextTile.data.requires });
		if ( inventoryItem ) {
			nextTile.ready = true;
			$rootScope.game.inventory = _.without($rootScope.game.inventory, inventoryItem);
		} else {
			$rootScope.updateStatus($rootScope.l10n.TXT_MISSING_PHOTO, true);
		}
		$scope.showPhoto = nextTile.ready;
		$scope.hint = $rootScope.l10n[nextTile.data.hint];
		$scope.puzzleKeyDownHandler = function(event) {
			switch (event.keyCode) {
				case 27:
					$location.path('/level');
					break;
				case 9:
					$rootScope.moveFocusOnTab(event);
					break;
			}
		};
		
		$scope.enterCode = function(event, letter) {
			if (event.keyCode === 13 || event.keyCode === 32) {
				if ($scope.message.length < 8) {
					$scope.message += letter;
				} else {
					$rootScope.updateStatus($rootScope.l10n.TXT_COMBINATION_TOO_LONG, true);
				}
			}
		};
		$scope.clearCode = function(event) {
			if (event.keyCode === 13 || event.keyCode === 32) {
				$scope.message = $scope.message.slice(0, -1);
			}
		};
		$scope.validateCode = function(event) {
			if (event.keyCode === 13 || event.keyCode === 32) {
				if ($scope.message === "FELIX") {
					$scope.locked = false;
					$scope.message = $rootScope.l10n.TXT_MESSAGE_UNLOCKED;
					$scope.hint = "";
					$rootScope.playSound("success");
					nextTile = $rootScope.game.level.floorplan[$rootScope.game.level.nextTileId];
					nextTile.class = "green";
					nextTile.ready = true;
					$timeout(function(){ $location.path('/level'); }, 1000);
				} else {
					$scope.error = true;
					$scope.message = $rootScope.l10n.TXT_MESSAGE_ERROR;
					$timeout(function(){ $scope.error = false; $scope.message = ""; }, 1200);
					$rootScope.playSound("error");
				}
			}
		};
		$scope.flipPhoto = function(event) {
			if (event.keyCode === 13 || event.keyCode === 32) {
				$scope.flippedOver = !$scope.flippedOver;
			}
		};
		$scope.showHint = function(hint) {
			$scope.pictureInFocus = !!hint.length;
			$rootScope.actionLog = hint;
		}
		$scope.test = function() {
			$scope.flippedOver = !$scope.flippedOver;
		}
	}
]);

app.controller('outroCtrl', ['$rootScope', '$scope', '$location', '$timeout',
	function($rootScope, $scope, $location, $timeout) {

		$rootScope.stopSound("ambientSound");

		if (!$rootScope.assetsLoaded) {
			$location.path('/');
		} else {
			$rootScope.stopSound("ambientSound");
			$rootScope.playSound("win", {volume: .1});
			$scope.isOutro = true;
			$scope.currentSlide = 0;
			$scope.continueGame = function($event) {
				if ($event.type === 'click' || $event.keyCode === 39) {
					$scope.message = "";
					if ($scope.currentSlide < $rootScope.outro.length) {
						$scope.isVisible = false;
						$timeout(function () {
							$scope.background = $rootScope.outro[$scope.currentSlide].image;
							$scope.message = $rootScope.l10n[$rootScope.outro[$scope.currentSlide].content];
							$scope.currentSlide++;
							$scope.isVisible = true;
							$rootScope.focusElement("#boxContent");
						}, 800, true, $scope);
					} else {
						$scope.isVisible = false;
						$location.path('/summary/');
					}
				}
			};
			$scope.continueGame({'type': 'click'});

		}
	}
]);

app.controller('summaryCtrl', ['$rootScope', '$scope',
	function($rootScope, $scope) {

		$rootScope.game.completed = true;
		$rootScope.saveState();
		$rootScope.focusElement(".content");

	}
]);

app.directive('languageSelect', function() {
	return {
		templateUrl: '_/tpl/languages.tpl.html'
	};
});

///*  UTILS  *///

utils.factory('$storage', ['$window', '$cookies', function($window, $cookies) {
	let expiry_days = 10;
	
	function isLocalStorageAvailable() {
		let str = 'test';
		try {
			localStorage.setItem(str, str);
			localStorage.removeItem(str);
			return true;
		} catch(e) {
			return false;
		}
	}

	return {
		set: function(key, value) {
			let d = new Date();
			if (isLocalStorageAvailable()) {
				$window.localStorage[key] = value;
			} else {
				$cookies(key, value, {expires: d.setDate(expiry_days)});
			}
		},
		get: function(key) {
			return (isLocalStorageAvailable()) ? $window.localStorage[key] : $cookies.get(key);
		},
		setObject: function(key, value) {
			let d = new Date(),
				o = JSON.stringify(value);
			if (isLocalStorageAvailable()) {
				$window.localStorage[key] = o;
			} else {
				$cookies.putObject(key, o, {expires: d.setDate(expiry_days)});
			}
		},
		getObject: function(key) {
			let r = (isLocalStorageAvailable()) ? $window.localStorage[key] : $cookies.getObject(key);
			return r ? JSON.parse(r) : false;
		},
		remove: function(key) {
			if (isLocalStorageAvailable()) {
				$window.localStorage.removeItem(key);
			} else {
				$cookies.remove[key];
			}
		}
	}
}]);

function generateUUID() {
	let r, d;
	d = new Date().getTime();
	if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
		d += performance.now(); //use high-precision timer if available
	}
	r = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		let r = (d + Math.random() * 16) % 16 | 0;
		d = Math.floor(d / 16);
		return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
	return r;
}


