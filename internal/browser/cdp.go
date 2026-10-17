package browser

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Sanjit-M/rental-radar/internal/config"
)

// CDPBrowser manages a local Chrome/Chromium process controlled via Chrome DevTools Protocol.
type CDPBrowser struct {
	cmd     *exec.Cmd
	port    int
	tmpDir  string
	cookies []config.Cookie
}

// LaunchCDP starts a Chrome/Chromium instance with a dedicated debugging port.
func LaunchCDP(ctx context.Context, cfg *config.Config, headless bool) (*CDPBrowser, error) {
	port, err := findFreePort()
	if err != nil {
		return nil, err
	}

	tmpDir, err := os.MkdirTemp("", "radar-cdp-*")
	if err != nil {
		return nil, err
	}

	args := []string{
		fmt.Sprintf("--remote-debugging-port=%d", port),
		"--remote-allow-origins=*",
		"--user-data-dir=" + tmpDir,
		"--no-first-run",
		"--no-default-browser-check",
		"--disable-blink-features=AutomationControlled",
		"--disable-dev-shm-usage",
		"--disable-background-networking",
		"--disable-sync",
		"--window-size=1920,1080",
		"--lang=en-US",
	}
	if headless {
		args = append(args, "--headless=new", "--no-sandbox", "--disable-gpu")
	}
	args = append(args, "about:blank")

	cmd := exec.CommandContext(ctx, cfg.ChromeBinaryPath, args...)
	cmd.Stdout = io.Discard
	cmd.Stderr = io.Discard
	if err := cmd.Start(); err != nil {
		_ = os.RemoveAll(tmpDir)
		return nil, fmt.Errorf("failed to start chrome (%s): %w", cfg.ChromeBinaryPath, err)
	}

	cookies, _ := cfg.LoadCookies()

	b := &CDPBrowser{
		cmd:     cmd,
		port:    port,
		tmpDir:  tmpDir,
		cookies: cookies,
	}

	// Wait up to 8s for DevTools HTTP endpoint to come up
	deadline := time.Now().Add(8 * time.Second)
	for time.Now().Before(deadline) {
		if b.isReady() {
			return b, nil
		}
		time.Sleep(150 * time.Millisecond)
	}

	b.Close()
	return nil, fmt.Errorf("timed out waiting for Chrome DevTools on port %d", port)
}

func (b *CDPBrowser) isReady() bool {
	client := &http.Client{Timeout: 800 * time.Millisecond}
	resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/json/version", b.port))
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == 200
}

// Close terminates the Chrome process and cleans up its temporary directory.
func (b *CDPBrowser) Close() {
	if b.cmd != nil && b.cmd.Process != nil {
		_ = b.cmd.Process.Kill()
		_ = b.cmd.Wait()
	}
	if b.tmpDir != "" {
		_ = os.RemoveAll(b.tmpDir)
	}
}

// CDPTab represents a single browser tab controlled via CDP WebSocket.
type CDPTab struct {
	targetID string
	port     int
	conn     net.Conn
	reader   *bufio.Reader
	writeMu  sync.Mutex
	nextID   atomic.Int64
	pending  sync.Map
	closed   atomic.Bool
}

type cdpTargetInfo struct {
	ID                   string `json:"id"`
	Type                 string `json:"type"`
	URL                  string `json:"url"`
	WebSocketDebuggerURL string `json:"webSocketDebuggerUrl"`
}

// NewTab opens a new tab in the Chrome instance, connects via WebSocket, and injects Facebook cookies.
func (b *CDPBrowser) NewTab(ctx context.Context) (*CDPTab, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequestWithContext(ctx, "PUT", fmt.Sprintf("http://127.0.0.1:%d/json/new?about:blank", b.port), nil)
	if err != nil {
		return nil, err
	}
	resp, err := client.Do(req)
	if err != nil {
		// Fallback to GET for older Chromium versions
		resp, err = client.Get(fmt.Sprintf("http://127.0.0.1:%d/json/new", b.port))
		if err != nil {
			return nil, err
		}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var target cdpTargetInfo
	if err := json.Unmarshal(body, &target); err != nil || target.WebSocketDebuggerURL == "" {
		return nil, fmt.Errorf("failed to parse CDP target: %v (%s)", err, string(body))
	}

	conn, reader, err := dialWebSocket(target.WebSocketDebuggerURL)
	if err != nil {
		return nil, err
	}

	tab := &CDPTab{
		targetID: target.ID,
		port:     b.port,
		conn:     conn,
		reader:   reader,
	}
	go tab.readLoop()

	_, _ = tab.Call(ctx, "Page.enable", nil)
	_, _ = tab.Call(ctx, "Runtime.enable", nil)
	_, _ = tab.Call(ctx, "Network.enable", nil)
	_, _ = tab.Call(ctx, "Network.setUserAgentOverride", map[string]any{
		"userAgent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
		"acceptLanguage": "en-US,en;q=0.9",
	})

	if len(b.cookies) > 0 {
		cdpCookies := make([]map[string]any, 0, len(b.cookies))
		for _, c := range b.cookies {
			domain := c.Domain
			if domain == "" {
				domain = ".facebook.com"
			}
			path := c.Path
			if path == "" {
				path = "/"
			}
			mc := map[string]any{
				"name":     c.Name,
				"value":    c.Value,
				"domain":   domain,
				"path":     path,
				"secure":   c.Secure,
				"httpOnly": c.HTTPOnly,
			}
			if c.Expires > 0 {
				mc["expires"] = c.Expires
			}
			cdpCookies = append(cdpCookies, mc)
		}
		_, _ = tab.Call(ctx, "Network.setCookies", map[string]any{"cookies": cdpCookies})
	}

	return tab, nil
}

// Navigate navigates the tab to the given URL and waits briefly for initial DOM population.
func (t *CDPTab) Navigate(ctx context.Context, targetURL string, wait time.Duration) error {
	_, err := t.Call(ctx, "Page.navigate", map[string]any{"url": targetURL})
	if err != nil {
		return err
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(wait):
		return nil
	}
}

// EvalString evaluates a JS expression that returns a string (or JSON.stringify result).
func (t *CDPTab) EvalString(ctx context.Context, expression string) (string, error) {
	res, err := t.Call(ctx, "Runtime.evaluate", map[string]any{
		"expression":    expression,
		"returnByValue": true,
		"awaitPromise":  true,
	})
	if err != nil {
		return "", err
	}
	var parsed struct {
		Result struct {
			Type  string `json:"type"`
			Value any    `json:"value"`
		} `json:"result"`
	}
	if err := json.Unmarshal(res, &parsed); err != nil {
		return "", err
	}
	if s, ok := parsed.Result.Value.(string); ok {
		return s, nil
	}
	return "", nil
}

// Close closes the CDP WebSocket and tells Chrome to close the target tab.
func (t *CDPTab) Close() {
	if t.closed.Swap(true) {
		return
	}
	_ = t.conn.Close()
	if t.targetID != "" {
		client := &http.Client{Timeout: 1 * time.Second}
		resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/json/close/%s", t.port, t.targetID))
		if err == nil {
			resp.Body.Close()
		}
	}
}

type cdpResponse struct {
	ID     int64           `json:"id"`
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// Call invokes a CDP method and waits for its response.
func (t *CDPTab) Call(ctx context.Context, method string, params map[string]any) (json.RawMessage, error) {
	id := t.nextID.Add(1)
	ch := make(chan cdpResponse, 1)
	t.pending.Store(id, ch)
	defer t.pending.Delete(id)

	req := map[string]any{
		"id":     id,
		"method": method,
	}
	if params != nil {
		req["params"] = params
	}
	payload, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	if err := t.writeFrame(payload); err != nil {
		return nil, err
	}

	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case resp := <-ch:
		if resp.Error != nil {
			return nil, fmt.Errorf("CDP %s error: %s", method, resp.Error.Message)
		}
		return resp.Result, nil
	case <-time.After(25 * time.Second):
		return nil, fmt.Errorf("CDP %s timeout", method)
	}
}

func (t *CDPTab) writeFrame(payload []byte) error {
	t.writeMu.Lock()
	defer t.writeMu.Unlock()

	var header []byte
	length := len(payload)
	header = append(header, 0x81) // FIN + text frame
	if length <= 125 {
		header = append(header, byte(0x80|length))
	} else if length <= 65535 {
		header = append(header, byte(0x80|126), byte(length>>8), byte(length))
	} else {
		header = append(header, byte(0x80|127))
		var b [8]byte
		binary.BigEndian.PutUint64(b[:], uint64(length))
		header = append(header, b[:]...)
	}

	var maskKey [4]byte
	_, _ = rand.Read(maskKey[:])
	header = append(header, maskKey[:]...)

	masked := make([]byte, length)
	for i := 0; i < length; i++ {
		masked[i] = payload[i] ^ maskKey[i%4]
	}

	if _, err := t.conn.Write(header); err != nil {
		return err
	}
	_, err := t.conn.Write(masked)
	return err
}

func (t *CDPTab) readLoop() {
	for !t.closed.Load() {
		msg, err := t.readFrame()
		if err != nil {
			return
		}
		var resp cdpResponse
		if err := json.Unmarshal(msg, &resp); err == nil && resp.ID > 0 {
			if val, ok := t.pending.Load(resp.ID); ok {
				ch := val.(chan cdpResponse)
				select {
				case ch <- resp:
				default:
				}
			}
		}
	}
}

func (t *CDPTab) readFrame() ([]byte, error) {
	var fullPayload []byte
	for {
		b0, err := t.reader.ReadByte()
		if err != nil {
			return nil, err
		}
		b1, err := t.reader.ReadByte()
		if err != nil {
			return nil, err
		}
		fin := (b0 & 0x80) != 0
		opcode := b0 & 0x0f
		masked := (b1 & 0x80) != 0
		length := int64(b1 & 0x7f)

		switch length {
		case 126:
			var ext [2]byte
			if _, err := io.ReadFull(t.reader, ext[:]); err != nil {
				return nil, err
			}
			length = int64(binary.BigEndian.Uint16(ext[:]))
		case 127:
			var ext [8]byte
			if _, err := io.ReadFull(t.reader, ext[:]); err != nil {
				return nil, err
			}
			length = int64(binary.BigEndian.Uint64(ext[:]))
		}

		var maskKey [4]byte
		if masked {
			if _, err := io.ReadFull(t.reader, maskKey[:]); err != nil {
				return nil, err
			}
		}

		chunk := make([]byte, length)
		if _, err := io.ReadFull(t.reader, chunk); err != nil {
			return nil, err
		}
		if masked {
			for i := int64(0); i < length; i++ {
				chunk[i] ^= maskKey[i%4]
			}
		}

		if opcode == 0x8 { // Close
			return nil, io.EOF
		}
		if opcode == 0x9 { // Ping
			continue
		}
		fullPayload = append(fullPayload, chunk...)
		if fin {
			return fullPayload, nil
		}
	}
}

func dialWebSocket(wsURL string) (net.Conn, *bufio.Reader, error) {
	u, err := url.Parse(wsURL)
	if err != nil {
		return nil, nil, err
	}
	conn, err := net.DialTimeout("tcp", u.Host, 5*time.Second)
	if err != nil {
		return nil, nil, err
	}

	var keyBytes [16]byte
	_, _ = rand.Read(keyBytes[:])
	wsKey := base64.StdEncoding.EncodeToString(keyBytes[:])

	req := fmt.Sprintf(
		"GET %s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n",
		u.RequestURI(), u.Host, wsKey,
	)
	if _, err := conn.Write([]byte(req)); err != nil {
		conn.Close()
		return nil, nil, err
	}

	reader := bufio.NewReaderSize(conn, 256*1024)
	statusLine, err := reader.ReadString('\n')
	if err != nil || !strings.Contains(statusLine, "101") {
		conn.Close()
		return nil, nil, fmt.Errorf("websocket handshake failed: %s (%v)", strings.TrimSpace(statusLine), err)
	}
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			conn.Close()
			return nil, nil, err
		}
		if line == "\r\n" || line == "\n" {
			break
		}
	}
	return conn, reader, nil
}

func findFreePort() (int, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port, nil
}
