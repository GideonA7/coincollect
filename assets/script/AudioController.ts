import { _decorator, assert, AudioClip, AudioSource, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioController')
export class AudioController extends Component {
    @property(AudioClip)
    collectClip: AudioClip = null!;   // 金币收集音效

    @property(AudioSource)
    audioSource: AudioSource = null!;

    /**
     * 播放金币收集音效
     */
    playCollect() {
        this.audioSource.playOneShot(this.collectClip, 1);
    }

}