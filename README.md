# SOLAR LINE 考察

SOLAR LINE（『良いソフトウェアトーク劇場』by ゆえぴこ）に描かれる軌道力学的描写の妥当性を考察するリポジトリ。

## Agent Loop Setup

```bash
# ビルド
docker build -t solar-line-agent .

# コンテナ作成・起動
docker run -it --name solar-line -v $(pwd):/workspace solar-line-agent
```

### コンテナ内の初期設定

```bash
# SSH 鍵生成 → 公開鍵を GitHub deploy key に登録 (write access 有効)
ssh-keygen -t ed25519 -N ""
cat ~/.ssh/id_ed25519.pub

# git remote を SSH に変更
git remote set-url origin git@github.com:sksat/solar-line.git

# Claude Code ログイン
claude /login

# (任意) Codex ログイン
codex

# エージェントループ開始
agent-loop
```

### コンテナ操作

```bash
# デタッチ: Ctrl+P, Ctrl+Q

# 別シェルで接続
docker exec -it solar-line bash

# 再接続
docker attach solar-line

# 停止 / 再開
docker stop solar-line
docker start -i solar-line
```
