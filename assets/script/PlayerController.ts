import { _decorator, Collider2D, Component, Contact2DType, EventKeyboard, Input, input, IPhysics2DContact, KeyCode, Node, UITransform } from 'cc';
import { Coin } from './Coin';
const { ccclass, property } = _decorator;

/**
 * 控制玩家移动 + 碰撞检测
 */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property
    playerSpeed: number = 200;   // 玩家初始移动速度设置为200，暴露到编辑器里可以改

    @property(Node)
    playerBoday: Node = null;   // 角色的图片单独一个节点，这样转向的时候只改变角色图片，不会影响碰撞体和其他节点

    // 标记 W A S D （上 左 下 右）按键是否被按下
    private isPressW = false;
    private isPressA = false;
    private isPressS = false;
    private isPressD = false;

    // 记录角色可移动的 x,y坐标 最大值
    private xMax = 0;   // 可移动范围 = 整个区域的最大宽度 - 角色宽度  ——> 可移动范围 / 2 为 xMax 即角色在区域里的最大横坐标
    private yMax = 0;   // 可移动范围 = 整个区域的最大高度 - 角色高度  ——> 可移动范围 / 2 为 yMax 即角色在区域里的最大纵坐标

    private collider: Collider2D = null;

    protected onEnable(): void {
        this.setupEventListeners();   // 绑定按键监听

        this.moveLimit();   // 组件启用时就先计算好角色可移动的坐标范围

        this.collider = this.node.getComponent(Collider2D);
        this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);   // 监听碰撞体的回调函数
    }

    protected onDisable(): void {
        this.cleanupEventListeners();   // 取消监听按键

        this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);   // 取消监听碰撞
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.tag === 1) {   // 设置coin的碰撞tag为1
            otherCollider.node.getComponent(Coin).handleCollected();
        }
    }

    /**
     * 处理角色每帧里的移动逻辑
     */
    protected update(dt: number): void {
        let directionX = 0;   // x方向上移动多少
        let directionY = 0;   // y方向上移动多少
        const moveStep = this.playerSpeed * dt;   // 角色移动的距离 = 速度 * 每帧经过的时间
        const position = this.node.getPosition();   // 获取角色当前的位置坐标，后续坐标 相对 当前坐标 更新
        
        if (this.isPressW) {   // 向上移动
            directionY += 1;
        }
        if (this.isPressS) {   // 向下移动
            directionY -= 1;
        }
        if (this.isPressA) {   // 向左移动
            directionX -= 1;
            this.playerBoday.setScale(-1, 1, 1);
        }
        if (this.isPressD) {   // 向右移动
            directionX += 1;
            this.playerBoday.setScale(1, 1, 1);
        }

        const length = Math.sqrt(directionX * directionX + directionY * directionY);   // 算出角色在倾斜放下上移动多长
        if (length === 0) return;   // 这个一定要写，因为初始没有移动的时候length为0，如果不返回directionX Y的值都会不对导致角色初始不显示
        directionX /= length;   // 归一化：固定倾斜方向上也一定1点的话，则水平 和 垂直 方向上移动的距离就应该是 正常的移动多少 / 长度比例
        directionY /= length;

        // 计算出移动后的 x和y 坐标
        const x = Math.max(-this.xMax, Math.min(position.x + directionX * moveStep, this.xMax));
        const y = Math.max(-this.yMax, Math.min(position.y + directionY * moveStep, this.yMax));

        this.node.setPosition(x, y, position.z);
    }

    /**
     * 启用键盘监听
     */
    setupEventListeners() {
        // 绑定键盘输入
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    /**
     * 取消键盘监听
     */
    cleanupEventListeners() {
        // 取消键盘监听
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);

        // 设置按钮状态为没有被按下 （如果不清理，防止重置的时候还在接收键盘按键 ——> 导致开局还没按角色就开始移动了，还在处理上一把的按键逻辑）
        this.isPressW = false;
        this.isPressA = false;
        this.isPressS = false;
        this.isPressD = false;
    }

    /**
     * 处理键盘按下时的逻辑
     */
    private onKeyDown(event: EventKeyboard) {
        switch(event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this.isPressW = true;   // 按下 w 或者 ⬆ 标记为true
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this.isPressA = true;   // 按下 a 或者 ⬅ 标记为true
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.isPressS = true;   // 按下 s 或者 ⬇ 标记为true
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.isPressD = true;   // 按下 d 或者 右 标记为true
                break;
        }
    }

    /**
     * 处理键盘释放时的逻辑
     */
    private onKeyUp(event: EventKeyboard) {
        switch(event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this.isPressW = false;   // 按下 w 或者 ⬆ 标记为false
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this.isPressA = false;   // 按下 a 或者 ⬅ 标记为false
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.isPressS = false;   // 按下 s 或者 ⬇ 标记为false
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.isPressD = false;   // 按下 d 或者 右 标记为false
                break;
        }
    }

    /**
     * 限制角色的可以动范围
     */
    private moveLimit() {
        // 得到整个可移动区域的宽、高
        const spawnerAreaTransform = this.node.getParent().getComponent(UITransform);
        const spawnerWidth = spawnerAreaTransform.width;
        const spawnerHeight = spawnerAreaTransform.height;
        
        // 得到角色的宽、高
        const playerTransform = this.node.getComponent(UITransform);
        const playerWidth = playerTransform.width;
        const playerHeight = playerTransform.height;

        // 计算出角色最大可移动的坐标
        this.xMax = (spawnerWidth - playerWidth) / 2;
        this.yMax = (spawnerHeight - playerHeight) / 2;
    }
}

