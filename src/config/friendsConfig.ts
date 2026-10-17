import type { FriendLink, FriendsPageConfig } from "../types/friendsConfig";
import { profileConfig } from "./profileConfig";

export const friendsPageConfig: FriendsPageConfig = {
  title: "友链小径", description: "在互联网的角落，遇见有趣的人。",
  showCustomContent: true, showComment: false, randomizeSort: false,
};

// Add friends here. The first entry is explicitly an example, not a claimed friendship.
export const friendsConfig: FriendLink[] = [{
  title: "你的友链位置", imgurl: profileConfig.avatar || "/favicon/unin.svg",
  desc: "示例位置 · 在配置文件里添加你喜欢的小站。", siteurl: "https://github.com/Unin-1",
  tags: ["示例"], weight: 1, enabled: true,
}];
export const getEnabledFriends = (): FriendLink[] =>
  friendsConfig.filter((friend) => friend.enabled).sort((a, b) => b.weight - a.weight);
