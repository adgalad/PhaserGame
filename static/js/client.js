var gameSettings = {
    playerSpeed: 300,
    laserSpeed: 600,
}
var socket = null;

function concatArray(a, b) {
    var c = new Int16Array(a.length + b.length);
    c.set(a);
    c.set(b, a.length);
    return c
}




class LatencyMeter {

    constructor(){
        this.startTime;
        self = this

        setInterval(function() {
          self.startTime = Date.now();
          socket.emit('pong', "");
        }, 1000);

        socket.socket.on('pong', function(data) {
            var latency = Date.now() - self.startTime;
            $("#latency").html(Math.floor(latency) + " ms")
        });
    }
}




class MenuScene extends Phaser.Scene {
    constructor() {
        super("menu")
    }

    create() {
        const self = this;
        var letters = [
            this.add.text(300, 250, "L", {font: "25px Arial"}),
            this.add.text(300 + 18, 250, "o", {font: "25px Arial"}),
            this.add.text(300 + 18*2, 250, "a", {font: "25px Arial"}),
            this.add.text(300 + 18*3, 250, "d", {font: "25px Arial"}),
            this.add.text(300 + 18*4, 250, "i", {font: "25px Arial"}),
            this.add.text(300 + 17*4 + 15, 250, "n", {font: "25px Arial"}),
            this.add.text(300 + 17*6, 250, "g", {font: "25px Arial"}),
        ]

        var current = 0
        this.interval = setInterval(function(){
            if (current-1 >= 0){
                letters[current-1].setColor("#ffffff")
            } else {
                letters[6].setColor("#ffffff")
            }

            letters[current].setColor("#ff0000")
            current = (current+1)%7
        }, 300)

        // socket = new Socket("ws://ec2-3-90-8-99.compute-1.amazonaws.com:8081");
        socket = new Socket("ws://0.0.0.0:8081");
        socket.socket.on("login", function(data) {
            self.login(data)
        })
    }

    login(data) {
        clearInterval(this.interval)
        this.scene.start("scene1", data)
    }

}




class Player extends Phaser.GameObjects.Sprite {

    constructor(scene, player) {
        var x = player.position.x
        var y = player.position.y

        super(scene, x, y, "player");
        this.name = scene.add.text(x - 30, y - 60, player.user)
        this.oldPosition = {x: x, y: y}
        this.scene = scene;
        this.array = new Int16Array(0);
        this.id = player.id;
        this.exploded = false

        scene.add.existing(this);
        scene.playersGroup.add(this)
        scene.localGroup.add(this)
        scene.physics.world.enableBody(this)



        this.setOrigin(0.5)
        this.animation = "shipLights"

        if (player.user == "carlos" || player.user  == "maria" || player.user == "vicky"){
            this.animation = "shipLights-"+player.user
        }
        this.play(this.animation)
        this.body.setCollideWorldBounds(true)

        this.cursorKeys = this.scene.input.keyboard.createCursorKeys()
        this.spaceBar = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.fired = false;
        this.scene = scene;
    }

    reset(x, y) {
        this.x = x
        this.y = y
        this.play(this.animation)
        this.name.visible = true
        this.name.x = x - 30
        this.name.y = y - 60
        this.exploded = false
    }

    explode() {
        this.name.visible = true
        this.exploded = true
        this.play("explosion")
        var self = this;
        setTimeout(function() {
            self.reset(Math.floor(Math.random()*config.width), Math.floor(Math.random()*config.height))

        }, 1000)
    }

    update() {
        this.move();
        this.name.x = this.x - 30
        this.name.y = this.y - 60
    }

    move() {
        if (this.exploded) {
            this.body.setVelocityX(0)
            this.body.setVelocityY(0)
            return
        }
        var vector = {
            x: 0,
            y: 0,
        }

        if (this.cursorKeys.left.isDown){
            vector.x -= gameSettings.playerSpeed
            this.flipX = true;
        }
        if (this.cursorKeys.right.isDown){
            vector.x += gameSettings.playerSpeed
            this.flipX = false;
        }

        if (this.cursorKeys.up.isDown){
            vector.y -= gameSettings.playerSpeed
        }
        if (this.cursorKeys.down.isDown){
            vector.y += gameSettings.playerSpeed
        }
        if (vector.x != 0 && vector.y != 0) {
            var c = Math.sqrt(Math.pow(gameSettings.playerSpeed, 2)/2)
            vector.x = vector.x > 0 ? c : -c
            vector.y = vector.y > 0 ? c : -c
        }
        this.body.setVelocityX(vector.x)
        this.body.setVelocityY(vector.y)
        if (this.oldPosition.x != this.x || this.oldPosition.y != this.y) {
            this.scene.pushToStream([socketEvents.MoveCharacter, this.id, this.x, this.y, this.flipX])
        }
        this.oldPosition.x = this.x
        this.oldPosition.y = this.y

        if (this.spaceBar.isDown && !this.fired){
            const laser = new Laser(this.scene, this.x,this.y, this.flipX, this.id)
            this.scene.pushToStream([socketEvents.CreateLaser, this.x, this.y, this.flipX, this.id, laser.id])
            this.fired = true;
        } else if (this.spaceBar.isUp) {
            this.fired = false;
        }
    }
}

class OnlinePlayer extends Phaser.GameObjects.Sprite {

    constructor(scene, player) {
        var x = player.position.x
        var y = player.position.y
        super(scene, x, y, "player");
        this.scene = scene;
        this.name = scene.add.text(x - 30, y - 60, player.user)
        this.array = new Int16Array(0);
        this.id = player.id;
        scene.add.existing(this);
        scene.playersGroup.add(this)
        scene.physics.world.enableBody(this)
        this.setOrigin(0.5)
        this.exploded = false

        this.animation = "shipLights"

        if (player.user == "carlos" || player.user  == "maria" || player.user == "vicky"){
            this.animation = "shipLights-"+player.user
        }
        this.play(this.animation)

        this.body.setCollideWorldBounds(true)
        this.moves = []
    }

    destroy() {

        this.name.destroy()
        var self = this;
        var lasers = this.scene.lasersGroup.getChildren()
        for (var i = lasers.length - 1; i >= 0; i--) {
            if (this.id == lasers[i].playerId) {
                lasers[i].destroy()
            }
        }
        super.destroy()
    }
    explode() {
        this.name.visible = true
        this.exploded = true
        this.play("explosion")
        var self = this;
        setTimeout(function() {
            self.reset()

        }, 1000)
    }

    reset() {
        this.visible = true
        this.play(this.animation)
        this.name.visible = true
        this.exploded = false
    }
    update() {
        this.move();
    }

    move() {

        if (this.moves.length > 0){
            var move = this.moves.shift()
            var newPos = move.position
            this.setPosition(newPos.x, newPos.y)

            this.flipX = move.flip
            // this.setVelocityX((newPos.x - this.x)*gameSettings.playerSpeed)
            // this.setVelocityY((newPos.y - this.y)*gameSettings.playerSpeed)
        } else {
            this.body.setVelocityX(0)
            this.body.setVelocityY(0)
        }
        this.name.x = this.x - 30
        this.name.y = this.y - 60
    }
}

class Laser extends Phaser.GameObjects.Sprite {

    constructor(scene, x, y, flip, playerId, id=undefined){
        super(scene, x, y, "laser")
        this.scene = scene;
        this.playerId = playerId;
        this.id = id != undefined ? id : Math.floor(Math.random()*2**15);
        this.online = id != undefined;
        scene.add.existing(this);
        scene.lasersGroup.add(this)
        scene.physics.world.enableBody(this)
        this.moves = []


        // this.speedX = speedX
        // this.speedY = speedY
        this.flip = flip
        // if (flip) {
        //     this.body.setVelocityX(-gameSettings.laserSpeed)
        // } else {
        //     this.body.setVelocityX(gameSettings.laserSpeed)
        // }
    }

    update() {
        this.move();
        if (this.x < 0 || this.x > config.width || this.y < 0 || this.y > config.height) {
            if (!this.online) {
                this.scene.pushToStream([socketEvents.MoveLaser, this.id, this.x, this.y])
            }
            this.destroy();
        } else if (!this.online) {
            this.scene.pushToStream([socketEvents.MoveLaser, this.id, this.x, this.y])
        }
    }

    move() {
        if (this.online) {
            if (this.moves.length > 0){
                var move = this.moves.shift()
                var newPos = move.position
                this.setPosition(newPos.x, newPos.y)
                // this.setVelocityX((newPos.x - this.x)*gameSettings.playerSpeed)
                // this.setVelocityY((newPos.y - this.y)*gameSettings.playerSpeed)
            } else {
                this.body.setVelocityX(0)
                this.body.setVelocityY(0)
            }

        } else {
            this.setPosition(this.flip ? this.x-10 : this.x+10, this.y)
        }

    }
}

const socketEvents = {
    MoveCharacter: 1,
    MoveLaser: 2,
    CreateLaser: 3,
    Explode: 4,
}

class Scene1 extends Phaser.Scene {

    constructor(data) {
        super("scene1")


        this.loginData = null
        this.stream = new Int16Array(0)

    }

    init(data) {
        this.loginData = data;
    }

    pushToStream(data) {
        this.stream = concatArray(this.stream, new Int16Array(data))
    }

    moveCharacter(data) {
        var move = {
            id: data[1],
            position: {x: data[2], y:data[3]},
            flip: data[4]
        }
        this.playersGroup.getChildren().forEach((object) => {
            if (object.id == move.id) {
                object.moves.push(move)
            }
        })
    }

    moveLaser(data){
        var move = {
            id: data[1],
            position: {x: data[2], y:data[3]},
        }
        this.lasersGroup.getChildren().forEach((laser) => {
            if (laser.id == move.id) {
                laser.moves.push(move)
            }
        })
    }

    createLaser(data) {

        new Laser(this, data[1], data[2], data[3], data[4], data[5])
    }

    explode(data) {

        this.playersGroup.getChildren().forEach((e)=>{
            if (e.id == data[1]) {
                e.explode()
            }
        })
        this.lasersGroup.getChildren().forEach((e) => {
            if (e.id == data[2]) {
                e.destroy()
            }
        })
    }

    preload() {
        this.playersGroup = this.physics.add.group();
        this.lasersGroup = this.physics.add.group();
        this.localGroup = this.physics.add.group();

        this.load.image('background1','assets/background1.jpg');
        this.load.image('laser','assets/sprites/laser.png');
        this.load.spritesheet('player','assets/sprites/ovni.png', {
            frameWidth: 128,
            frameHeight: 63,
        });

        this.load.spritesheet('carlos','assets/sprites/carlos.png', {
            frameWidth: 128,
            frameHeight: 63,
        });

        this.load.spritesheet('vicky','assets/sprites/vicky.png', {
            frameWidth: 128,
            frameHeight: 63,
        });

        this.load.spritesheet('maria','assets/sprites/mv.png', {
            frameWidth: 128,
            frameHeight: 63,
        });
        this.load.spritesheet("explosion", "assets/sprites/explosion.png", {
            frameWidth: 64,
            frameHeight: 64,
        })



        const self = this;

        socket.socket.on("newPlayer", function(data) {

            if (data.id != self.player.id) {
                new OnlinePlayer(self, data.player)
            }
        })

        socket.socket.on("hello", function(data){


            self.playersGroup.getChildren().forEach(function(player){
                console.log(player.id, data)
                if (player.id == data) {
                    player.destroy()
                }
            })
        })

        socket.socket.on("update", function(data) {
            var array = new Int16Array(data);
            var carrier = 0;
            // console.log(array);
            while(carrier < array.length){
                switch(array[carrier]) {
                    case socketEvents.MoveCharacter:
                        var data = array.slice(carrier, carrier+5)
                        carrier += 5
                        self.moveCharacter(data);
                        break;
                    case socketEvents.MoveLaser:
                        var data = array.slice(carrier, carrier+4)
                        carrier += 4

                        self.moveLaser(data);
                        break;
                    case socketEvents.CreateLaser:

                        var data = array.slice(carrier, carrier+6)
                        carrier += 6
                        self.createLaser(data);
                        break;
                    case socketEvents.Explode:
                        var data = array.slice(carrier, carrier+3)
                        carrier += 3
                        self.explode(data);
                        break;
                    default:
                        console.error("Id de evento no reconocido '"+array[0]+"'")
                }
            }
        })
    }

    // addObject(object) {
    //     object.scene = this;
    //     this.objects.push(object)
    // }

    // addLaser(laser) {
    //     laser.scene = this
    //     this.lasers.push(laser);
    // }
    create(){

        this.latency = new LatencyMeter()
        this.anims.create({
            key: "shipLights",
            frames: this.anims.generateFrameNumbers("player"),
            frameRate: 10,
            repeat: -1,
        })

        this.anims.create({
            key: "shipLights-carlos",
            frames: this.anims.generateFrameNumbers("carlos"),
            frameRate: 10,
            repeat: -1,
        })

        this.anims.create({
            key: "shipLights-vicky",
            frames: this.anims.generateFrameNumbers("vicky"),
            frameRate: 10,
            repeat: -1,
        })

        this.anims.create({
            key: "shipLights-maria",
            frames: this.anims.generateFrameNumbers("maria"),
            frameRate: 10,
            repeat: -1,
        })

        this.anims.create({
            key: "explosion",
            frames: this.anims.generateFrameNumbers("explosion"),
            frameRate: 20,
            repeat: 0,
        })

        this.background = this.add.tileSprite(0,0,config.width, config.height,'background1');
        this.background.setOrigin(0,0)

        const self = this;
        for(var id in this.loginData.players) {
            var player = this.loginData.players[id]
            if (!self.playersGroup.getChildren().reduce((acc, cur) => acc || cur.id == player.id, false)) {
                if (player.id === self.loginData.id) {
                    self.player = new Player(self, player)
                }
                else {
                    new OnlinePlayer(self, player)
                }
            }
        }

        this.physics.add.collider(this.lasersGroup, this.playersGroup, function(laser, player) {
            if (player.id != laser.playerId && player.exploded == false) {
                laser.destroy();
                player.explode()
                self.pushToStream([socketEvents.Explode, player.id, laser.id])

            }
        })


        // this.physics.add.collider(this.playersGroup, this.playersGroup, function(p1, p2) {
        //     // .name.visible = true
        //     p1.play("explosion")
        //     p2.play("explosion")

        //     setTimeout(function() {
        //         p1.reset(Math.floor(Math.random()*config.width), Math.floor(Math.random()*config.height))
        //         p2.reset(Math.floor(Math.random()*config.width), Math.floor(Math.random()*config.height))

        //     }, 2000)
        // })

        this.physics.add.collider(this.lasersGroup, this.lasersGroup, function(l1, l2) {
            l1.destroy()
            l2.destroy()
        })

    }

    emitStream() {
        if (this.stream.length > 0) {
            socket.emit("update", this.stream.buffer)
            this.stream = new Int16Array(0)
        }
    }

    update() {
        this.playersGroup.getChildren().forEach((e)=>e.update())
        this.lasersGroup.getChildren().forEach((e)=>e.update())
        this.background.tilePositionX += 0.5;
        this.emitStream()
    }
}


var config = {
    width: 1200,
    height: 720,
    backgroundColor: 0x000000,
    scene: [MenuScene, Scene1],
    physics: {
        default: "arcade",
        arcade: {
            debug: false,
        }
    },
    user: "p1"
}

// window.onload = function() {
    // var game = new Phaser.Game(config);
// }

class Socket {
    constructor(url) {
        this.socket = io(url);
        var _this = this;
        this.socket.on('connect', function(s) {
            const urlParams = new URLSearchParams(window.location.search);
            _this.socket.emit('login', {user: config.user, keu: "key"});
        });
    }



    emit(message, data) {
        this.socket.emit(message, data)
    }

}


function initGame(){
    config.user = $("#character").val()
    $("#form").remove()
    var game = new Phaser.Game(config)

}
// var socket = new Socket("ws://ec2-3-90-8-99.compute-1.amazonaws.com:25330");
// var socket = new Socket("ws://0.0.0.0:5000");