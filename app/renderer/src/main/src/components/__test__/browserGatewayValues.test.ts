import { expect, it } from 'vitest'
import { gatewayPacketValue } from '../browserGatewayValues'

it('reads saved form/json/header/query values without inventing intermediate values', () => {
  const form =
    'POST /?token=a%2Bb HTTP/1.1\r\nContent-Type: application/x-www-form-urlencoded\r\n\r\nencryptedData=%7B%22username%22%3A%22hacker%22%7D&repeat=a&repeat=b'
  expect(gatewayPacketValue(form, 'body.encryptedData')).toBe('{\n  "username": "hacker"\n}')
  expect(gatewayPacketValue(form, 'body.repeat')).toBe('[\n  "a",\n  "b"\n]')
  expect(gatewayPacketValue(form, 'query.token')).toBe('a+b')
  expect(gatewayPacketValue(form, 'header.Content-Type')).toBe('application/x-www-form-urlencoded')
  expect(gatewayPacketValue(form, 'body.missing')).toBeUndefined()
  const json = 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"data":{"count":0,"success":false}}'
  expect(gatewayPacketValue(json, 'body.data.count')).toBe('0')
  expect(gatewayPacketValue(json, 'body.data.success')).toBe('false')
  expect(gatewayPacketValue(json, 'body.toString')).toBeUndefined()
  expect(
    gatewayPacketValue(json.replace('Content-Type:', 'Transfer-Encoding: chunked\nContent-Type:'), 'body'),
  ).toBeUndefined()
  expect(gatewayPacketValue('not a packet', 'body')).toBeUndefined()
})
