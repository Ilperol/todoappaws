const AWS = require('aws-sdk');
const { ulid } = require('ulid');

let dynamoDb = null;

const getClient = () => {
  if (!dynamoDb) {
    dynamoDb = new AWS.DynamoDB.DocumentClient({
      httpOptions: { timeout: 1000 },
    });
  }
  return dynamoDb;
};

module.exports.createTodo = async (event) => {
  const data = JSON.parse(event.body);
  const dynamoDb = getClient();

  if (!data.name) {
    return { statusCode: 400, body: JSON.stringify({ error: '"name" is required' }) };
  }

  const item = {
    pk: `TODO#${ulid()}`,
    sk: 'TASK',
    name: data.name,
    checked: false,
    createdAt: new Date().toISOString(),
  };

  const params = {
    TableName: process.env.TODOS_TABLE,
    Item: item,
    ConditionExpression: 'attribute_not_exists(pk)',
  };

  try {
    await dynamoDb.put(params).promise();
    return { statusCode: 201, body: JSON.stringify(item) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not create ToDo' }) };
  }
};

module.exports.getTodos = async () => {
  const params = {
    TableName: process.env.TODOS_TABLE,
  };

  try {
    const result = await getClient().scan(params).promise();
    return { statusCode: 200, body: JSON.stringify(result.Items) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not fetch ToDos' }) };
  }
};

module.exports.updateTodo = async (event) => {
  const data = JSON.parse(event.body);
  const dynamoDb = getClient();
  const { id } = event.pathParameters;

  if (typeof data.name !== 'string' || typeof data.checked !== 'boolean') {
    return { statusCode: 400, body: JSON.stringify({ error: '"name" must be a string and "checked" must be a boolean' }) };
  }

  const params = {
    TableName: process.env.TODOS_TABLE,
    Key: { pk: `TODO#${id}`, sk: 'TASK' },
    UpdateExpression: 'set #name = :name, checked = :checked',
    ExpressionAttributeNames: { '#name': 'name' },
    ExpressionAttributeValues: { ':name': data.name, ':checked': data.checked },
    ConditionExpression: 'attribute_exists(pk)',
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await dynamoDb.update(params).promise();
    return { statusCode: 200, body: JSON.stringify(result.Attributes) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not update ToDo' }) };
  }
};

module.exports.deleteTodo = async (event) => {
  const dynamoDb = getClient();
  const { id } = event.pathParameters;

  const params = {
    TableName: process.env.TODOS_TABLE,
    Key: { pk: `TODO#${id}`, sk: 'TASK' },
    ConditionExpression: 'attribute_exists(pk)',
  };

  try {
    await dynamoDb.delete(params).promise();
    return { statusCode: 204, body: null };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not delete ToDo' }) };
  }
};
