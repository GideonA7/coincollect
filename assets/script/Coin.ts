import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

// 定义coin向外通知的方法
type CoinCollectedHandle = {
    onCollect: (coin: Coin) => void;
};

/**
 * 控制coin的销毁和创建
 */
@ccclass('Coin')
export class Coin extends Component {
    private score: number = 0;
    private event: CoinCollectedHandle = null;

    init(event: CoinCollectedHandle) {   // 初始化的时候传入回调方法
        this.event = event;
    }

    setScore(score: number) {
        this.score = score;
    }

    getScore(): number {
        return this.score;
    }

    // 处理金币被收集时的逻辑
    handleCollected() {
        this.event.onCollect(this);   // 通知外部gamemanager更新数据
        this.node.destroy();   // 销毁当前coin节点
    }
}

