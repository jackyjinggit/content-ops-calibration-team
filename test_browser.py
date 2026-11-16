# -*- coding: utf-8 -*-
"""内容级验收：真在浏览器里打开页面、点按钮、验对话与卡片渲染（不只看引擎数字）"""
import sys
from playwright.sync_api import sync_playwright

PAGE = "file:///F:/research_workspace/content-calibration-team/index.html"
PY_OK = "C:/Users/Q1070/AppData/Local/Programs/Python/Python314/python.exe"

def main():
    results = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(PAGE, wait_until="domcontentloaded")
        page.wait_for_timeout(500)

        # 内容级断言 1：标题与说明条
        title = page.title()
        r1 = "内容运营校准师" in title
        print(f"[1] 页面标题 = {title!r} -> {'PASS' if r1 else 'FAIL'}")
        results.append(r1)

        body = page.inner_text("body")
        r2 = "不是参赛作品本体" in body and "实时计算" in body
        print(f"[2] 诚实边界声明在位 -> {'PASS' if r2 else 'FAIL'}")
        results.append(r2)

        # 点击开始校准（回归用例）
        page.click("#runBtnDemo")
        page.wait_for_timeout(3500)  # 等三专家串行动画走完

        # 内容级断言 3：三专家对话出现
        msgs = page.locator(".msg.show")
        n_msg = msgs.count()
        r3 = n_msg >= 5  # 你 + 采集员2条 + 判断员 + 复核员
        print(f"[3] 对话消息数 = {n_msg}（期望≥5）-> {'PASS' if r3 else 'FAIL'}")
        results.append(r3)

        chat_text = page.inner_text("#chat")
        has_roles = all(x in chat_text for x in ["数据采集员", "业务判断员", "质量复核员"])
        r4 = has_roles
        print(f"[4] 三专家角色都发言 -> {'PASS' if r4 else 'FAIL'}")
        results.append(r4)

        # 内容级断言 5：最终卡片渲染 = 4 张
        cards = page.locator(".action-card")
        n_cards = cards.count()
        r5 = n_cards == 4
        print(f"[5] 最终卡片数 = {n_cards}（期望4）-> {'PASS' if r5 else 'FAIL'}")
        results.append(r5)

        # 内容级断言 6：复核结论为通过
        review = page.inner_text("#reviewBox")
        r6 = "复核通过" in review and "4 张" in review
        print(f"[6] 复核结论通过且计数一致 -> {'PASS' if r6 else 'FAIL'}")
        results.append(r6)

        # 内容级断言 7：无页面脚本错误
        r7 = len(errs) == 0
        print(f"[7] 页面脚本错误 = {errs} -> {'PASS' if r7 else 'FAIL'}")
        results.append(r7)

        # 切换边界用例再验一次（0.019975）
        page.wait_for_function("document.getElementById('runBtnDemo').disabled === false", timeout=10000)
        page.click("#tabDemo")  # 确保 demo 模式
        page.evaluate("loadDemo('boundary')")
        page.click("#runBtnDemo")
        page.wait_for_timeout(3500)
        cards2 = page.locator(".action-card").count()
        r8 = cards2 == 1
        print(f"[8] 边界用例卡片数 = {cards2}（期望1）-> {'PASS' if r8 else 'FAIL'}")
        results.append(r8)
        final_text = page.inner_text("#finalCards")
        r9 = "0.019975" in final_text or "原始互动率" in final_text
        print(f"[9] 边界用例证据含原始值 -> {'PASS' if r9 else 'FAIL'}")
        results.append(r9)

        browser.close()

    ok = all(results)
    print(f"\n########## 内容级验收：{'ALL_PASS' if ok else 'FAIL'} ({sum(results)}/{len(results)}) ##########")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
