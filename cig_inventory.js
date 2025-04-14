
const maxParts = 6;
let currentPart = 1;
const allParts = {}; // part 번호 → 아이템 리스트

function loadPart(part) {
    if (allParts[part]) {
        currentPart = part;
        render();
        return;
    }
    fetch(`cigarette_part_${part}.csv`)
        .then(res => res.text())
        .then(text => {
            const lines = text.split('\n').slice(1);
            const newItems = lines.map(line => {
                const [name, group] = line.split(',');
                return { name: name?.trim(), group: group?.trim(), error: 0, box: 0, boxInput: 0 };
            }).filter(i => i.name && i.group);
            allParts[part] = newItems;
            currentPart = part;
            render();
        })
        .catch(e => console.error("CSV 로딩 실패:", e));
}

function render() {
    const container = document.getElementById('inventory');
    const items = allParts[currentPart] || [];
    container.innerHTML = '';
    document.getElementById('pageInfo').textContent = `${currentPart} / ${maxParts}`;

    let currentGroup = '';
    items.forEach((item, i) => {
        if (item.group !== currentGroup) {
            currentGroup = item.group;
            container.innerHTML += `<div class="group-title">[${currentGroup}]</div>`;
        }
        container.innerHTML += `
          <div class="item">
            <strong>${item.name}</strong>
            <div class="controls">
              오차:
              <button class="btn" onclick="change('error', ${i}, -1)">-</button>
              <span>${item.error}</span>
              <button class="btn" onclick="change('error', ${i}, 1)">+</button>
              | 보루:
              <button class="btn" onclick="change('box', ${i}, -1)">-</button>
              <span>${item.box}</span>
              <button class="btn" onclick="change('box', ${i}, 1)">+</button>
              <button class="btn reset-btn" onclick="resetItem(${i})" title="초기화">🔄</button>
            </div>
          </div>`;
    });
}

function change(type, i, delta) {
    const item = allParts[currentPart][i];
    if (type === 'box') {
        item[type] = Math.max(0, item[type] + delta);
    } else {
        item[type] += delta;
    }
    render();
}

function resetItem(i) {
    allParts[currentPart][i].error = 0;
    allParts[currentPart][i].box = 0;
    render();
}

function changePage(direction) {
    const newPage = currentPart + direction;
    if (newPage < 1 || newPage > maxParts) return;
    loadPart(newPage);
}

function generateChecklist() {
    const boxItems = [];
    let hasAnyInput = false;

    for (const part in allParts) {
        allParts[part].forEach(item => {
            if (item.error !== 0 || item.box > 0) {
                hasAnyInput = true;
            }
            if (item.box > 0) {
                boxItems.push(item);
            }
        });
    }

    if (!hasAnyInput) {
        alert("입력 내용이 없습니다.");
        return;
    }

    if (boxItems.length === 0) {
        generateFinalList(); // 보루는 없지만 오차가 있으므로 바로 리스트 출력
        return;
    }

    renderChecklist(boxItems);
}

function renderChecklist(list) {
    const boxDiv = document.getElementById('boxChecklist');
    boxDiv.innerHTML = '<h2>보루 재고 조사</h2>';
    list.forEach((item, i) => {
        boxDiv.innerHTML += `
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="min-width: 120px;">${item.name}(${item.box}개) -></span>
            <button class="btn" onclick="adjustBoxInput('${item.name}', ${i}, -1)">-</button>
            <span id="input-${i}">${item.boxInput}</span>
            <button class="btn" onclick="adjustBoxInput('${item.name}', ${i}, 1)">+</button>
          </div>`;
    });
    boxDiv.innerHTML += `
        <div style="text-align: right; margin-top: 10px;">
            <button onclick="generateFinalList()" id="total-btn">완료</button>
        </div>
        `;
}

function adjustBoxInput(name, index, delta) {
    for (const part in allParts) {
        const found = allParts[part].find((d, i) => d.name === name && d.box > 0);
        if (found) {
            found.boxInput = Math.max(0, (found.boxInput || 0) + delta);
            document.getElementById(`input-${index}`).textContent = found.boxInput;
            break;
        }
    }
}

function generateFinalList() {
    let resultText = '담배 재고 조사 완료했습니다.\n\n<담배 재고 현황>\n';
    const grouped = {};
    for (const part in allParts) {
        allParts[part].forEach(item => {
            const totalDiff = item.error + ((item.boxInput || 0) - item.box) * 10;
            if (totalDiff !== 0) {
                if (!grouped[item.group]) grouped[item.group] = [];
                grouped[item.group].push({ name: item.name, total: totalDiff });
            }

        });
    }
    Object.entries(grouped).forEach(([group, list]) => {
        resultText += `\n[${group}]\n`;
        list.forEach(d => {
            const displayDiff = d.total > 0 ? `+${d.total}` : d.total;
            resultText += `• ${d.name} ${displayDiff}\n`;
        });
    });
    if (resultText.trim() === '담배 재고 조사 완료했습니다.\n\n<담배 재고 현황>') {
        resultText += '\n오차 없음';
    }
    document.getElementById("finalBoxDiff").innerHTML = `
        <pre>${resultText}</pre>
        <div style="text-align: right;">
        <button onclick="copyFinalResult()">📋복사하기</button>
        </div>
    `;
}

function copyFinalResult() {
    const result = document.querySelector("#finalBoxDiff pre").textContent;
    if (!result.trim()) {
        alert("복사할 내용이 없습니다!");
        return;
    }
    navigator.clipboard.writeText(result).then(() => {
        alert("복사 성공");
    }).catch(() => {
        alert("복사 실패");
    });
}


loadPart(currentPart); // 처음에 1번 파트 자동 로딩
