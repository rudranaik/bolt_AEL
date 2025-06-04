import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import LightningFS from '@isomorphic-git/lightning-fs';

const fs = new LightningFS('fs');

export async function initRepo() {
  await git.init({ fs, dir: '/' });
}

export async function addAndCommit(message: string) {
  await git.add({ fs, dir: '/', filepath: '.' });
  await git.commit({
    fs,
    dir: '/',
    message,
    author: {
      name: process.env.GIT_USER || 'WebContainer User',
      email: process.env.GIT_EMAIL || 'user@webcontainer.io'
    }
  });
}

export async function push(remote = 'origin', branch = 'main') {
  await git.push({
    fs,
    http,
    dir: '/',
    remote,
    ref: branch,
    onAuth: () => ({
      username: process.env.GIT_TOKEN
    })
  });
}