# Base image for Cursor cloud agents. Cursor checks out the repository itself;
# this image only provides the OS toolchain. Dependencies install via `install`
# in environment.json.
FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
ARG NODE_VERSION=24.21.0
ARG BUN_VERSION=1.4.3
ARG DOCKER_VERSION=5:28.5.2-1~ubuntu.24.04~noble

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		build-essential \
		ca-certificates \
		curl \
		git \
		gnupg \
		jq \
		sudo \
		tmux \
		unzip \
		xz-utils \
	&& rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
		| tar -xJ -C /usr/local --strip-components=1 --no-same-owner \
	&& corepack enable

# Cursor prepends its own older Node (/exec-daemon/node) to agent shell PATHs,
# so pnpm is told to run every script on the repo's Node instead of whichever
# `node` resolves first.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
	npm_config_use_node_version=${NODE_VERSION}

RUN curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash -s "bun-v${BUN_VERSION}"

RUN install -m 0755 -d /etc/apt/keyrings \
	&& curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli.gpg \
	&& chmod a+r /etc/apt/keyrings/githubcli.gpg \
	&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli.gpg] https://cli.github.com/packages stable main" \
		> /etc/apt/sources.list.d/github-cli.list \
	&& curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
	&& chmod a+r /etc/apt/keyrings/docker.gpg \
	&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
		> /etc/apt/sources.list.d/docker.list \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends \
		containerd.io \
		"docker-ce=${DOCKER_VERSION}" \
		"docker-ce-cli=${DOCKER_VERSION}" \
		docker-buildx-plugin \
		docker-compose-plugin \
		fuse-overlayfs \
		gh \
		iptables \
	&& rm -rf /var/lib/apt/lists/*

# Docker runs nested inside the agent VM, which needs fuse-overlayfs storage
# and legacy iptables.
RUN mkdir -p /etc/docker \
	&& printf '{\n  "storage-driver": "fuse-overlayfs"\n}\n' > /etc/docker/daemon.json \
	&& update-alternatives --set iptables /usr/sbin/iptables-legacy \
	&& update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

RUN groupadd -f docker \
	&& usermod -aG docker,sudo ubuntu \
	&& echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu \
	&& chmod 0440 /etc/sudoers.d/ubuntu

USER ubuntu
