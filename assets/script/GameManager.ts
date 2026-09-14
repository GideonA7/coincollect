import { _decorator, Button, Component, EventKeyboard, Input, input, instantiate, KeyCode, Label, Node, Prefab, Tween, tween, UITransform, Vec3 } from 'cc';
import { Coin } from './Coin';
import { PlayerController } from './PlayerController';
import { AudioManager } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 定义游戏的4种状态：准备、游戏中、暂停、游戏结束
 */
enum GameState{
    Ready,
    Playing,
    Pause,
    GameOver,
};

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Prefab)
    coinPrefab: Prefab = null;

    @property(Node)
    spawnerArea: Node = null;

    @property(Label)
    readyLabel: Label = null;

    @property(Label)
    scoreLabel: Label = null;

    @property(Label)
    timeLabel: Label = null;

    @property(Label)
    historyLabel: Label = null;

    @property(Label)
    stateLabel: Label = null;

    @property(Label)
    gameOverLabel: Label = null;

    @property(Button)
    restartButton: Button = null;

    @property(Button)
    pauseResumeButton: Button = null;

    @property(Node)
    player: Node = null;

    @property(AudioManager)
    audioManager: AudioManager = null;

    private score = 0;   // 记录分数
    private historyScore = 0;   // 保存历史最高分

    @property
    initialTime: number = 30;   // 初始时间30s

    private time = 30;   // 运行中的时间
    private spawnerAreaTransform: UITransform = null;
    private playerController: PlayerController = null;
    private state = GameState.Ready;   // 设置全局游戏状态 初始为 ready

    protected start(): void {
        this.spawnerAreaTransform = this.spawnerArea.getComponent(UITransform);
        this.playerController = this.player.getComponent(PlayerController);
        this.historyScore = Number(localStorage.getItem("historyScore")) ?? 0;   // 获取浏览器本地存储的历史最高分数
        this.prepareGame();
    }

    protected onEnable(): void {
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.restartButton.node.on(Button.EventType.CLICK, this.restartGame, this);   // 绑定重新开始游戏按钮监听
        this.pauseResumeButton.node.on(Button.EventType.CLICK, this.pauseResumeGame, this);   // 绑定 暂停/继续 按钮
    }

    protected onDisable(): void {
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.restartButton.node.off(Button.EventType.CLICK, this.restartGame, this);   // 取消监听 重新开始游戏 按钮
        this.pauseResumeButton.node.off(Button.EventType.CLICK, this.pauseResumeGame, this);   // 取消监听 暂停/继续 按钮
    }

    protected update(dt: number): void {
        if (this.state !== GameState.Playing) {   // 只有在 游戏中 的状态下 时间才会改变
            return;
        }

        this.time = Math.max(0, this.time - dt);

        this.updateView();

        if (this.time === 0) {
            this.setCurState(GameState.GameOver);
        }
    }

    /**
     * 设置当前游戏状态
     * @param state 游戏状态
     */
    setCurState(state: GameState) {
        console.log("gamestate:", state);
        this.state = state;
        switch(this.state) {
            case GameState.Ready:   // 准备状态下：显示准备提示、倒计时不能动、玩家也不能移动
                this.gameOverLabel.node.active = false;
                this.pauseResumeButton.node.active = false;   // 隐藏暂停/继续按钮
                this.stateLabel.string = '当前状态：准备中';
                this.readyLabel.node.active = true;
                this.playerController.cleanupEventListeners();   // 禁止监听玩家移动
                break;
            case GameState.Playing:   // 游戏中状态：玩家可以移动、倒计时正常减少、金币可以被拾取
                this.readyLabel.node.active = false;   // 隐藏初始提示
                this.stateLabel.string = '当前状态：游戏中';
                this.pauseResumeButton.getComponentInChildren(Label).string = '暂停游戏';
                this.pauseResumeButton.node.active = true;
                this.playerController.setupEventListeners();
                break;
            case GameState.Pause:   // 暂停状态下：按钮显示继续游戏、玩家不能移动、倒计时停止、金币不能被拾取
                this.stateLabel.string = '当前状态：游戏暂停';
                this.pauseResumeButton.getComponentInChildren(Label).string = '继续游戏';
                this.playerController.cleanupEventListeners();
                break;
            case GameState.GameOver:   // 游戏结束状态下
                this.stateLabel.string = '当前状态：游戏结束';
                this.pauseResumeButton.node.active = false;
                this.gameOver();
                break;
        }
        this.updateView();
    }

    /**
     * 生成金币
     */
    createCoin() {
        const coinNode = instantiate(this.coinPrefab);   // 实例化一个金币预制体
        const coin = coinNode.getComponent(Coin);
        const coinTransform = coinNode.getComponent(UITransform);
        const coinScore = Math.random() < 0.7 ? 10 : 50;   // 7:3的概率生成特殊金币，特殊金币分值为50
        coin.setScore(coinScore);   // 设置金币分数
        if (coinScore === 50) {
            // 为50分的特殊金币，给他的样式设置的比普通的大一点
            coinTransform.width = 48;
            coinTransform.height = 48;
        }
        coinNode.setPosition(this.randomPosition(coinTransform));   // 设置coin的位置
        coin.init({
            onCollect: this.coinCollected
        });   // 初始化给金币传入回调方法，当金币被碰撞销毁后 回调回来更新信息
        this.spawnerArea.addChild(coinNode);
        tween(coinNode)   // 生成金币时加一个缩放动画
            .to(
                0.6,
                {
                    scale: new Vec3(1.08, 1.08, 0),
                },
                {
                    easing: 'quadIn',
                },
            )
            .to(
                0.4,
                {
                    scale: Vec3.ONE,
                },
                {
                    easing: 'quadOut',
                }
            )
            .start();

    }

    /**
     * 收集金币
     */
    coinCollected = (coin: Coin) => {
        if (this.state === GameState.GameOver) return;   // 游戏结束后就不再收集金币了
        this.score += coin.getScore();
        Tween.stopAllByTarget(coin.node);   // 停止金币动画
        this.audioManager.playCollect();
        this.createCoin();   // 收集一个就再随机刷新一个金币，让场上永远有金币在
        this.updateView();
    };

    /**
     * 随机生成金币的位置
     */
    private randomPosition(coinTransform: UITransform): Vec3 {
        const xMax = (this.spawnerAreaTransform.width - coinTransform.width) / 2;   // 金币能生成的最大x坐标位置
        const yMax = (this.spawnerAreaTransform.height - coinTransform.height) / 2;   // 金币能生成的最大y坐标位置
        return new Vec3(this.randomBetween(-xMax, xMax), this.randomBetween(-yMax, yMax), 0);
    }

    /**
     * 随机生成数字
     */
    private randomBetween(min: number, max: number): number {
        return min + Math.random() * (max - min);   // 随机范围：从最小坐标开始 ～ 最大坐标 之间
    }

    /**
     * 重新开始游戏
     */
    private restartGame() {
        for (const node of this.spawnerArea.children) {
            if (node !== this.player) {   // 把除了玩家以外的节点全删了（这些都是金币节点）——> 相当于清理上一局的金币状态
                // node.removeFromParent();
                node.destroy();
            }
        }
        this.prepareGame();
    }

    /**
     * 准备游戏（初始化游戏状态）
     */
    private prepareGame() {
        this.score = 0;    // 设置本局分数为0
        this.time = this.initialTime;
        this.gameOverLabel.node.active = false;
        this.player.setPosition(0, 0, 0);
        for (let i = 0; i < 3; i++) {
            this.createCoin();   // 初始随机生成3个金币
        }
        this.setCurState(GameState.Ready);
    }

    /**
     * 时间到，游戏结束：玩家停止移动 + 显示本局得分 + 重新开始按钮
     */
    private gameOver() {
        this.playerController.cleanupEventListeners();   // 设置玩家不可移动
        this.gameOverLabel.string = `本局最终得分：${this.score}`;
        this.gameOverLabel.node.active = true;

        if (this.score > this.historyScore) {
            this.historyScore = this.score;
            localStorage.setItem("historyScore", `${this.historyScore}`);
        }
        
        Tween.stopAll();   // 停止所有的动画
    }

    /**
     * 刷新游戏ui
     */
    private updateView() {
        this.scoreLabel.string = `分数：${this.score}`;
        this.timeLabel.string = `游戏时间：${Math.ceil(this.time)}`;    // 每帧更新时间，向上取整显示，当前s完全结束，才到下一秒
        this.historyLabel.string = `历史最高得分：${this.historyScore}`;
    }

    /**
     * 确认按键按完之后，开始处理对应操作
     */
    private onKeyUp(event: EventKeyboard) {
        if (this.state === GameState.Ready) {
            switch(event.keyCode) {
                case KeyCode.SPACE:   // 开始游戏
                    this.setCurState(GameState.Playing);
                    break;
            }
        } else if (this.state === GameState.Playing || this.state === GameState.Pause) {
            switch(event.keyCode) {
                case KeyCode.KEY_P:   // 暂停 或 继续 游戏
                    this.pauseResumeGame();
                    break;
            }
        }
    }

    /**
     * 暂停 / 继续 游戏
     */
    private pauseResumeGame() {
        const state = this.state === GameState.Pause ? GameState.Playing : GameState.Pause;   // 判断当前状态是否为暂停，是则 设置状态为暂停，否则设置状态为游戏中
        this.setCurState(state);
    }
}

