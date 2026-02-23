FROM node:24-bookworm

RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    openssh-client \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# User (uid 1000 to match typical host user)
RUN userdel -r node \
    && useradd -m -s /bin/bash -u 1000 agent \
    && echo 'agent ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# GitHub known_hosts
RUN mkdir -p /home/agent/.ssh && ssh-keyscan github.com >> /home/agent/.ssh/known_hosts \
    && chown -R agent:agent /home/agent/.ssh

# Allow mounted repos with different ownership
RUN git config --global --add safe.directory '*'

# Rust (as agent)
USER agent
RUN git config --global --add safe.directory '*'
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && . /home/agent/.cargo/env \
    && rustup target add wasm32-unknown-unknown
ENV PATH="/home/agent/.cargo/bin:${PATH}"

# Claude Code & Codex CLI
USER root
RUN npm install -g @anthropic-ai/claude-code @openai/codex

COPY agent-loop.sh /usr/local/bin/agent-loop
RUN chmod +x /usr/local/bin/agent-loop

USER agent
WORKDIR /workspace

CMD ["bash"]
